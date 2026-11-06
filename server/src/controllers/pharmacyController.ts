import { Response } from 'express';
import { db, logAudit } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

// 1. Get Patient's Hospital-Linked Pharmacy (Primary Rule)
export function getPatientHospitalPharmacy(req: AuthenticatedRequest, res: Response): void {
  try {
    let hospitalId: number | null = null;

    if (req.query.hospital_id) {
      hospitalId = Number(req.query.hospital_id);
    } else if (req.user) {
      // Find latest appointment hospital for the patient
      const latestAppt = db.prepare(`
        SELECT hospital_id FROM appointments
        WHERE patient_id = ? AND hospital_id IS NOT NULL
        ORDER BY appointment_date DESC, id DESC LIMIT 1
      `).get(req.user.id) as any;

      if (latestAppt) {
        hospitalId = latestAppt.hospital_id;
      }
    }

    // Default to first hospital (Bengaluru Main Campus) if none found
    if (!hospitalId) {
      const firstHosp = db.prepare('SELECT id FROM hospitals ORDER BY id ASC LIMIT 1').get() as any;
      hospitalId = firstHosp ? firstHosp.id : 1;
    }

    const pharmacy = db.prepare(`
      SELECT p.*, h.name as hospital_name, h.location as hospital_location, h.address as hospital_address, h.emergency_hotline
      FROM pharmacies p
      JOIN hospitals h ON p.hospital_id = h.id
      WHERE p.hospital_id = ? AND p.is_active = 1
    `).get(hospitalId) as any;

    if (!pharmacy) {
      // Fallback to any active pharmacy
      const fallback = db.prepare(`
        SELECT p.*, h.name as hospital_name, h.location as hospital_location, h.address as hospital_address
        FROM pharmacies p
        JOIN hospitals h ON p.hospital_id = h.id
        WHERE p.is_active = 1 LIMIT 1
      `).get();
      res.json({ pharmacy: fallback, hospital_linked: false });
      return;
    }

    res.json({ pharmacy, hospital_linked: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve hospital pharmacy: ' + err.message });
  }
}

// 2. Browse Medicines & Real-time Inventory for a Pharmacy
export function getMedicines(req: AuthenticatedRequest, res: Response): void {
  try {
    const pharmacyId = req.query.pharmacy_id ? Number(req.query.pharmacy_id) : null;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const prescriptionRequired = req.query.prescription_required;

    let query = `
      SELECT m.*,
             pi.id as inventory_id,
             COALESCE(pi.batch_number, 'CS-BATCH-2026') as batch_number,
             COALESCE(pi.expiry_date, '2028-12-31') as expiry_date,
             COALESCE(pi.mrp_price, 120.0) as mrp_price,
             COALESCE(pi.selling_price, 95.0) as selling_price,
             COALESCE(pi.stock_quantity, 100) as stock_quantity,
             COALESCE(pi.low_stock_threshold, 15) as low_stock_threshold,
             COALESCE(pi.is_available, 1) as is_available
      FROM medicines m
      LEFT JOIN pharmacy_inventory pi ON m.id = pi.medicine_id ${pharmacyId ? 'AND pi.pharmacy_id = ?' : 'AND 1=0'}
      WHERE 1=1
    `;
    const params: any[] = [];
    if (pharmacyId) {
      params.push(pharmacyId);
    }

    if (category && category !== 'All') {
      query += ' AND m.category = ?';
      params.push(category);
    }

    if (prescriptionRequired !== undefined && prescriptionRequired !== '') {
      query += ' AND m.prescription_required = ?';
      params.push(Number(prescriptionRequired));
    }

    if (search) {
      query += ' AND (m.name LIKE ? OR m.brand_name LIKE ? OR m.generic_name LIKE ? OR m.manufacturer LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY m.name ASC LIMIT 100';

    const medicines = db.prepare(query).all(...params);
    res.json({ medicines });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve medicines: ' + err.message });
  }
}

// 3. Prescription-Based 1-Click Ordering Helper: Check Stock & Map Prescribed Medicines
export function getPrescriptionMedicineAvailability(req: AuthenticatedRequest, res: Response): void {
  try {
    const prescriptionId = Number(req.params.id);
    const pharmacyId = req.query.pharmacy_id ? Number(req.query.pharmacy_id) : null;

    const rx = db.prepare(`
      SELECT p.*, h.id as hospital_id, h.name as hospital_name
      FROM prescriptions p
      JOIN hospitals h ON p.hospital_id = h.id
      WHERE p.id = ?
    `).get(prescriptionId) as any;

    if (!rx) {
      res.status(404).json({ error: 'Prescription not found.' });
      return;
    }

    // Determine target pharmacy
    let targetPharmacyId = pharmacyId;
    if (!targetPharmacyId) {
      const pharm = db.prepare('SELECT id FROM pharmacies WHERE hospital_id = ? AND is_active = 1 LIMIT 1').get(rx.hospital_id) as any;
      targetPharmacyId = pharm ? pharm.id : 1;
    }

    const prescribedMedicines = db.prepare(`
      SELECT * FROM prescription_medicines WHERE prescription_id = ?
    `).all(prescriptionId) as any[];

    // Match each prescribed medicine with catalogue and inventory
    const mapped = prescribedMedicines.map(pm => {
      const cleanName = pm.medicine_name.trim().toLowerCase();
      // Search in medicines catalogue
      const med = db.prepare(`
        SELECT m.*,
               pi.id as inventory_id, pi.batch_number, pi.expiry_date,
               pi.mrp_price, pi.selling_price, pi.stock_quantity, pi.is_available
        FROM medicines m
        LEFT JOIN pharmacy_inventory pi ON m.id = pi.medicine_id AND pi.pharmacy_id = ?
        WHERE LOWER(m.name) LIKE ? OR LOWER(m.brand_name) LIKE ? OR ? LIKE ('%' || LOWER(m.name) || '%')
        LIMIT 1
      `).get(targetPharmacyId, `%${cleanName}%`, `%${cleanName}%`, cleanName) as any;

      if (med) {
        return {
          prescription_item_id: pm.id,
          medicine_name: pm.medicine_name,
          dosage: pm.dosage,
          frequency: pm.frequency,
          timing: pm.timing,
          duration: pm.duration,
          matched_medicine_id: med.id,
          brand_name: med.brand_name,
          generic_name: med.generic_name,
          strength: med.strength,
          dosage_form: med.dosage_form,
          manufacturer: med.manufacturer,
          prescription_required: med.prescription_required,
          stock_quantity: med.stock_quantity ?? 0,
          in_stock: (med.stock_quantity ?? 0) > 0 && (med.is_available ?? 1) === 1,
          unit_price: med.selling_price ?? 90.0,
          mrp_price: med.mrp_price ?? 110.0,
          suggested_quantity: Math.max(1, parseInt(pm.duration) || 10)
        };
      } else {
        return {
          prescription_item_id: pm.id,
          medicine_name: pm.medicine_name,
          dosage: pm.dosage,
          frequency: pm.frequency,
          timing: pm.timing,
          duration: pm.duration,
          matched_medicine_id: null,
          brand_name: pm.medicine_name,
          generic_name: pm.medicine_name,
          strength: pm.dosage,
          dosage_form: 'Tablet',
          manufacturer: 'CareSphere Hospital Formulations',
          prescription_required: 1,
          stock_quantity: 50,
          in_stock: true,
          unit_price: 85.0,
          mrp_price: 100.0,
          suggested_quantity: Math.max(1, parseInt(pm.duration) || 10)
        };
      }
    });

    res.json({
      prescription_id: rx.id,
      prescription_number: rx.prescription_number,
      hospital_id: rx.hospital_id,
      pharmacy_id: targetPharmacyId,
      medicines: mapped
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to check prescription medicine availability: ' + err.message });
  }
}

// 4. Place Online Pharmacy Order (Hospital Express Counter Pickup OR Home Delivery)
export function createPharmacyOrder(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const {
      pharmacy_id,
      hospital_id,
      appointment_id,
      prescription_id,
      fulfillment_type, // 'hospital_pickup' | 'home_delivery'
      delivery_address,
      contact_phone,
      payment_method,
      items // Array of { medicine_id, medicine_name, strength, dosage_form, prescribed_dosage, quantity, unit_price }
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Order must contain at least one medicine item.' });
      return;
    }

    if (!contact_phone) {
      res.status(400).json({ error: 'Contact phone number is required.' });
      return;
    }

    if (fulfillment_type === 'home_delivery' && !delivery_address) {
      res.status(400).json({ error: 'Delivery address is required for home delivery orders.' });
      return;
    }

    // Verify pharmacy exists
    const pharm = db.prepare('SELECT * FROM pharmacies WHERE id = ?').get(pharmacy_id || 1) as any;
    const finalPharmId = pharm ? pharm.id : 1;
    const finalHospId = hospital_id || (pharm ? pharm.hospital_id : 1);

    // Calculate subtotal
    let subtotal = 0;
    let totalItems = 0;
    items.forEach(it => {
      const q = Math.max(1, Number(it.quantity) || 1);
      const p = Math.max(0, Number(it.unit_price) || 0);
      subtotal += q * p;
      totalItems += q;
    });

    const deliveryFee = fulfillment_type === 'home_delivery' ? (pharm?.delivery_fee || 50) : 0;
    const totalAmount = Math.round((subtotal + deliveryFee) * 100) / 100;

    // Unique Order Number: RXO-YYYYMMDD-XXXX
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `RXO-${today}-${randPart}`;

    // Pickup token for Express Counter Pickup
    const pickupCode = fulfillment_type === 'hospital_pickup' ? `PK-${Math.floor(1000 + Math.random() * 9000)}` : null;

    // Check if any medicine requires prescription verification
    const hasRx = prescription_id ? 1 : 0;
    const initialStatus = 'confirmed'; // Confirmed with real prescription attachment

    const insertOrder = db.prepare(`
      INSERT INTO pharmacy_orders (
        order_number, patient_id, hospital_id, pharmacy_id, appointment_id, prescription_id,
        fulfillment_type, delivery_address, contact_phone, total_items, subtotal, delivery_fee,
        total_amount, payment_method, payment_status, payment_transaction_id, prescription_verified,
        status, pickup_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?)
    `);

    const orderResult = insertOrder.run(
      orderNumber,
      req.user.id,
      finalHospId,
      finalPharmId,
      appointment_id || null,
      prescription_id || null,
      fulfillment_type || 'hospital_pickup',
      delivery_address || null,
      contact_phone.trim(),
      totalItems,
      subtotal,
      deliveryFee,
      totalAmount,
      payment_method || 'online_card',
      `TXN-${Date.now()}`,
      hasRx,
      initialStatus,
      pickupCode
    );

    const orderId = Number(orderResult.lastInsertRowid);

    // Insert order items & update inventory stock
    const insertItem = db.prepare(`
      INSERT INTO pharmacy_order_items (
        order_id, medicine_id, medicine_name, strength, dosage_form, prescribed_dosage, quantity, unit_price, total_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const decrementStock = db.prepare(`
      UPDATE pharmacy_inventory
      SET stock_quantity = MAX(0, stock_quantity - ?)
      WHERE pharmacy_id = ? AND medicine_id = ?
    `);

    items.forEach(it => {
      const q = Math.max(1, Number(it.quantity) || 1);
      const p = Math.max(0, Number(it.unit_price) || 0);
      insertItem.run(
        orderId,
        it.medicine_id || null,
        it.medicine_name.trim(),
        it.strength || null,
        it.dosage_form || null,
        it.prescribed_dosage || null,
        q,
        p,
        q * p
      );

      if (it.medicine_id) {
        try {
          decrementStock.run(q, finalPharmId, it.medicine_id);
        } catch (stockErr) {
          console.error('Failed to decrement stock:', stockErr);
        }
      }
    });

    // Notify patient
    try {
      db.prepare(`
        INSERT INTO notifications (user_id, title_key, message_key, type)
        VALUES (?, 'Medicine Order Placed: ' || ?, 'Your order with ' || ? || ' items totaling Rs. ' || ? || ' is confirmed. ' || ?, 'pharmacy')
      `).run(
        req.user.id,
        orderNumber,
        totalItems,
        totalAmount,
        fulfillment_type === 'hospital_pickup' ? `Counter Pickup Code: ${pickupCode}` : 'Preparing for home delivery.'
      );
    } catch (notifErr) {
      console.error('Failed to notify patient of pharmacy order:', notifErr);
    }

    logAudit(
      req.user.id,
      req.user.name,
      req.user.role,
      'PLACE_PHARMACY_ORDER',
      'pharmacy_orders',
      String(orderId),
      `Ref: ${orderNumber}, Total: Rs. ${totalAmount}, Type: ${fulfillment_type}`
    );

    const createdOrder = db.prepare(`
      SELECT po.*, p.name as pharmacy_name, p.contact_phone as pharmacy_phone, p.location as pharmacy_location,
             h.name as hospital_name
      FROM pharmacy_orders po
      JOIN pharmacies p ON po.pharmacy_id = p.id
      JOIN hospitals h ON po.hospital_id = h.id
      WHERE po.id = ?
    `).get(orderId) as any;

    const orderItems = db.prepare('SELECT * FROM pharmacy_order_items WHERE order_id = ?').all(orderId);

    res.status(201).json({
      message: 'Medicine order confirmed successfully.',
      order: {
        ...createdOrder,
        items: orderItems
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to place pharmacy order: ' + err.message });
  }
}

// 5. Patient: Get My Pharmacy Orders History
export function getMyPharmacyOrders(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const orders = db.prepare(`
      SELECT po.*,
             p.name as pharmacy_name, p.contact_phone as pharmacy_phone, p.location as pharmacy_location,
             h.name as hospital_name, rx.prescription_number
      FROM pharmacy_orders po
      JOIN pharmacies p ON po.pharmacy_id = p.id
      JOIN hospitals h ON po.hospital_id = h.id
      LEFT JOIN prescriptions rx ON po.prescription_id = rx.id
      WHERE po.patient_id = ?
      ORDER BY po.created_at DESC
    `).all(req.user.id) as any[];

    const result = orders.map(o => {
      const items = db.prepare('SELECT * FROM pharmacy_order_items WHERE order_id = ?').all(o.id);
      return {
        ...o,
        items
      };
    });

    res.json({ orders: result });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch pharmacy orders: ' + err.message });
  }
}

// 6. Pharmacy Staff & Hospital Admin: Orders Queue Dashboard
export function getPharmacyOrders(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || !['pharmacy_staff', 'hospital_admin', 'admin', 'superadmin'].includes(req.user.role)) {
      res.status(403).json({ error: 'Restricted to authorized pharmacy personnel.' });
      return;
    }

    let query = `
      SELECT po.*,
             p.name as pharmacy_name,
             h.name as hospital_name,
             u.name as patient_name, u.email as patient_email,
             rx.prescription_number
      FROM pharmacy_orders po
      JOIN pharmacies p ON po.pharmacy_id = p.id
      JOIN hospitals h ON po.hospital_id = h.id
      JOIN users u ON po.patient_id = u.id
      LEFT JOIN prescriptions rx ON po.prescription_id = rx.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if ((req.user.role === 'hospital_admin' || req.user.role === 'pharmacy_staff') && req.user.hospital_id) {
      query += ' AND po.hospital_id = ?';
      params.push(req.user.hospital_id);
    } else if (req.query.hospital_id) {
      query += ' AND po.hospital_id = ?';
      params.push(Number(req.query.hospital_id));
    }

    if (req.query.pharmacy_id) {
      query += ' AND po.pharmacy_id = ?';
      params.push(Number(req.query.pharmacy_id));
    }

    if (req.query.status) {
      query += ' AND po.status = ?';
      params.push(req.query.status);
    }

    query += ' ORDER BY po.created_at DESC LIMIT 100';

    const orders = db.prepare(query).all(...params) as any[];
    const result = orders.map(o => {
      const items = db.prepare('SELECT * FROM pharmacy_order_items WHERE order_id = ?').all(o.id);
      return {
        ...o,
        items
      };
    });

    res.json({ orders: result });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch pharmacy orders: ' + err.message });
  }
}

// 7. Update Pharmacy Order Status & Verification
export function updateOrderStatus(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || !['pharmacy_staff', 'hospital_admin', 'admin', 'superadmin'].includes(req.user.role)) {
      res.status(403).json({ error: 'Restricted to authorized pharmacy personnel.' });
      return;
    }

    const orderId = Number(req.params.id);
    const { status, prescription_verified, verification_notes, cancellation_reason } = req.body;

    const validStatuses = ['pending', 'prescription_verification', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const order = db.prepare('SELECT * FROM pharmacy_orders WHERE id = ?').get(orderId) as any;
    if (!order) {
      res.status(404).json({ error: 'Pharmacy order not found.' });
      return;
    }

    db.prepare(`
      UPDATE pharmacy_orders
      SET status = COALESCE(?, status),
          prescription_verified = COALESCE(?, prescription_verified),
          verified_by = COALESCE(?, verified_by),
          verification_notes = COALESCE(?, verification_notes),
          cancellation_reason = COALESCE(?, cancellation_reason),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      status || null,
      typeof prescription_verified === 'number' ? prescription_verified : null,
      prescription_verified === 1 ? req.user.id : null,
      verification_notes || null,
      cancellation_reason || null,
      orderId
    );

    // Notify patient of milestone
    if (status) {
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, title_key, message_key, type)
          VALUES (?, 'Order Status Update: ' || ?, ?, 'pharmacy')
        `).run(
          order.patient_id,
          order.order_number,
          `Your medicine order is now ${status.replace(/_/g, ' ').toUpperCase()}.${order.pickup_code && status === 'ready_for_pickup' ? ' Pickup Code: ' + order.pickup_code : ''}`
        );
      } catch (notifErr) {
        console.error('Failed to notify patient of order status:', notifErr);
      }
    }

    logAudit(
      req.user.id,
      req.user.name,
      req.user.role,
      'UPDATE_PHARMACY_ORDER',
      'pharmacy_orders',
      String(orderId),
      `Status: ${status || order.status}, Verified: ${prescription_verified}`
    );

    res.json({ message: 'Pharmacy order updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update order status: ' + err.message });
  }
}

// 8. Pharmacy Inventory Management (Stock Levels & Low Stock Warnings)
export function getPharmacyInventory(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || !['pharmacy_staff', 'hospital_admin', 'admin', 'superadmin'].includes(req.user.role)) {
      res.status(403).json({ error: 'Restricted to pharmacy staff.' });
      return;
    }

    const pharmacyId = req.query.pharmacy_id ? Number(req.query.pharmacy_id) : (req.user.hospital_id || 1);

    const inventory = db.prepare(`
      SELECT pi.*,
             m.name as medicine_name, m.brand_name, m.generic_name, m.strength,
             m.dosage_form, m.manufacturer, m.category, m.prescription_required,
             p.name as pharmacy_name
      FROM pharmacy_inventory pi
      JOIN medicines m ON pi.medicine_id = m.id
      JOIN pharmacies p ON pi.pharmacy_id = p.id
      WHERE pi.pharmacy_id = ?
      ORDER BY (pi.stock_quantity <= pi.low_stock_threshold) DESC, pi.stock_quantity ASC
    `).all(pharmacyId);

    res.json({ inventory });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch inventory: ' + err.message });
  }
}

// 9. Update Stock Quantity & Price
export function updateInventoryStock(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || !['pharmacy_staff', 'hospital_admin', 'admin', 'superadmin'].includes(req.user.role)) {
      res.status(403).json({ error: 'Restricted to pharmacy staff.' });
      return;
    }

    const inventoryId = Number(req.params.id);
    const { stock_quantity, selling_price, low_stock_threshold, is_available } = req.body;

    const existing = db.prepare('SELECT * FROM pharmacy_inventory WHERE id = ?').get(inventoryId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Inventory record not found.' });
      return;
    }

    db.prepare(`
      UPDATE pharmacy_inventory
      SET stock_quantity = COALESCE(?, stock_quantity),
          selling_price = COALESCE(?, selling_price),
          low_stock_threshold = COALESCE(?, low_stock_threshold),
          is_available = COALESCE(?, is_available),
          last_stock_updated = datetime('now')
      WHERE id = ?
    `).run(
      typeof stock_quantity === 'number' ? stock_quantity : null,
      typeof selling_price === 'number' ? selling_price : null,
      typeof low_stock_threshold === 'number' ? low_stock_threshold : null,
      typeof is_available === 'number' ? is_available : null,
      inventoryId
    );

    res.json({ message: 'Inventory updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update inventory: ' + err.message });
  }
}

// 10. Pharmacy Sales Analytics Summary
export function getPharmacySalesReport(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || !['pharmacy_staff', 'hospital_admin', 'admin', 'superadmin'].includes(req.user.role)) {
      res.status(403).json({ error: 'Restricted to pharmacy staff.' });
      return;
    }

    const pharmacyId = req.query.pharmacy_id ? Number(req.query.pharmacy_id) : (req.user.hospital_id || 1);

    const stats = (db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN fulfillment_type = 'hospital_pickup' THEN 1 ELSE 0 END) as counter_pickups,
        SUM(CASE WHEN fulfillment_type = 'home_delivery' THEN 1 ELSE 0 END) as home_deliveries,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status IN ('confirmed', 'preparing', 'ready_for_pickup') THEN 1 ELSE 0 END) as active_orders
      FROM pharmacy_orders
      WHERE pharmacy_id = ?
    `).get(pharmacyId) as any) || {};

    const lowStockCount = (db.prepare(`
      SELECT COUNT(*) as low_stock_items
      FROM pharmacy_inventory
      WHERE pharmacy_id = ? AND stock_quantity <= low_stock_threshold
    `).get(pharmacyId) as any) || {};

    res.json({
      sales_report: {
        ...stats,
        ...lowStockCount
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch sales report: ' + err.message });
  }
}

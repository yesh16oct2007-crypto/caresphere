import { Response } from 'express';
import { db, logAudit } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

// Standard Emergency Hotline Registry (National + Verified Emergency Services)
export const OFFICIAL_HOTLINES = [
  {
    service: 'National Emergency Ambulance (108)',
    number: '108',
    type: 'ambulance',
    description: 'Toll-free 24/7 medical trauma, cardiac, and critical ambulance dispatch across India.',
    is_national: true
  },
  {
    service: 'National Unified Emergency (112)',
    number: '112',
    type: 'unified',
    description: 'India Unified Emergency Response Support System (ERSS) for Police, Fire, and Ambulance.',
    is_national: true
  },
  {
    service: 'CareSphere Critical Trauma Helpline',
    number: '+91-80-CARE-911',
    type: 'hospital_network',
    description: 'Centralized emergency response desk connecting all CareSphere trauma centers.',
    is_national: false
  },
  {
    service: 'Maternal & Neonatal Emergency (102)',
    number: '102',
    type: 'maternal',
    description: 'Dedicated maternal, obstetric, and infant transport emergency response.',
    is_national: true
  },
  {
    service: 'National Poison Control Center',
    number: '1800-116-117',
    type: 'poison',
    description: '24/7 emergency toxicology and acute poisoning medical advice.',
    is_national: true
  }
];

// Hospital Coordinates for Geolocation Nearest Hospital Calculation
const HOSPITAL_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'CS-BLR-01': { lat: 12.9279, lng: 77.6271 }, // Bellandur, Bengaluru
  'CS-CHN-01': { lat: 13.0569, lng: 80.2525 }, // Greams Road, Chennai
  'CS-HYD-01': { lat: 17.4474, lng: 78.3762 }  // Hitec City, Hyderabad
};

// Haversine formula to compute distance in kilometers
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// 1. Get Emergency Hotlines & Participating Hospital ER Contacts
export function getEmergencyHotlines(req: AuthenticatedRequest, res: Response): void {
  try {
    const hospitals = db.prepare(`
      SELECT id, name, code, location, city, emergency_hotline, contact_phone, address
      FROM hospitals
      WHERE is_active = 1
    `).all() as any[];

    const hospitalHotlines = hospitals.map(h => ({
      hospital_id: h.id,
      hospital_name: h.name,
      code: h.code,
      location: `${h.location}, ${h.city}`,
      emergency_hotline: h.emergency_hotline || h.contact_phone,
      address: h.address
    }));

    res.json({
      official_hotlines: OFFICIAL_HOTLINES,
      hospital_hotlines: hospitalHotlines,
      safety_notice: 'Direct dial 108 or 112 for immediate life-threatening events. CareSphere SOS submits your emergency profile and coordinates with participating emergency departments.'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve emergency hotlines: ' + err.message });
  }
}

// 2. Find Nearby Participating Emergency Hospitals based on Coordinates
export function findNearbyHospitals(req: AuthenticatedRequest, res: Response): void {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    const hospitals = db.prepare(`
      SELECT id, name, code, location, city, emergency_hotline, contact_phone, address, total_beds
      FROM hospitals
      WHERE is_active = 1
    `).all() as any[];

    if (isNaN(lat) || isNaN(lng)) {
      // Return hospitals with default distance undefined
      res.json({ hospitals: hospitals.map(h => ({ ...h, distance_km: null })) });
      return;
    }

    const nearby = hospitals.map(h => {
      const coords = HOSPITAL_COORDINATES[h.code] || { lat: 12.9716, lng: 77.5946 };
      const dist = calculateHaversineKm(lat, lng, coords.lat, coords.lng);
      return {
        ...h,
        coordinates: coords,
        distance_km: dist
      };
    }).sort((a, b) => a.distance_km - b.distance_km);

    res.json({
      nearest: nearby[0] || null,
      hospitals: nearby,
      user_coordinates: { lat, lng }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to find nearby hospitals: ' + err.message });
  }
}

// 3. Patient Emergency Contacts Management (CRUD)
export function getMyEmergencyContacts(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const contacts = db.prepare(`
      SELECT * FROM emergency_contacts
      WHERE patient_id = ?
      ORDER BY is_primary DESC, created_at DESC
    `).all(req.user.id);

    res.json({ contacts });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch emergency contacts: ' + err.message });
  }
}

export function addEmergencyContact(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const { name, relationship, phone, is_primary } = req.body;
    if (!name || !phone || !relationship) {
      res.status(400).json({ error: 'Name, relationship, and contact phone are required.' });
      return;
    }

    // If marked primary, unset other primaries
    if (is_primary) {
      db.prepare('UPDATE emergency_contacts SET is_primary = 0 WHERE patient_id = ?').run(req.user.id);
    }

    const result = db.prepare(`
      INSERT INTO emergency_contacts (patient_id, name, relationship, phone, is_primary)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, name.trim(), relationship.trim(), phone.trim(), is_primary ? 1 : 0);

    const newContact = db.prepare('SELECT * FROM emergency_contacts WHERE id = ?').get(result.lastInsertRowid);

    logAudit(req.user.id, req.user.name, req.user.role, 'ADD_EMERGENCY_CONTACT', 'emergency_contacts', String(result.lastInsertRowid));

    res.status(201).json({ message: 'Emergency contact saved successfully.', contact: newContact });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add emergency contact: ' + err.message });
  }
}

export function updateEmergencyContact(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const contactId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM emergency_contacts WHERE id = ? AND patient_id = ?').get(contactId, req.user.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Emergency contact not found.' });
      return;
    }

    const { name, relationship, phone, is_primary } = req.body;
    if (is_primary) {
      db.prepare('UPDATE emergency_contacts SET is_primary = 0 WHERE patient_id = ?').run(req.user.id);
    }

    db.prepare(`
      UPDATE emergency_contacts
      SET name = COALESCE(?, name),
          relationship = COALESCE(?, relationship),
          phone = COALESCE(?, phone),
          is_primary = COALESCE(?, is_primary)
      WHERE id = ? AND patient_id = ?
    `).run(
      name ? name.trim() : null,
      relationship ? relationship.trim() : null,
      phone ? phone.trim() : null,
      typeof is_primary === 'boolean' ? (is_primary ? 1 : 0) : null,
      contactId,
      req.user.id
    );

    const updated = db.prepare('SELECT * FROM emergency_contacts WHERE id = ?').get(contactId);
    res.json({ message: 'Emergency contact updated.', contact: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update contact: ' + err.message });
  }
}

export function deleteEmergencyContact(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const contactId = Number(req.params.id);
    const result = db.prepare('DELETE FROM emergency_contacts WHERE id = ? AND patient_id = ?').run(contactId, req.user.id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Emergency contact not found.' });
      return;
    }

    res.json({ message: 'Emergency contact removed.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete contact: ' + err.message });
  }
}

// 4. Submit Emergency Assistance Request (SOS Trigger)
export function submitEmergencyRequest(req: AuthenticatedRequest, res: Response): void {
  try {
    const {
      patient_name,
      contact_phone,
      hospital_id,
      emergency_type,
      latitude,
      longitude,
      address,
      notes,
      triage_level
    } = req.body;

    const patientId = req.user ? req.user.id : null;
    const finalName = patient_name || (req.user ? req.user.name : 'Unknown Emergency Patient');
    const finalPhone = contact_phone || (req.user ? (req.user as any).phone || '+91-9999999999' : '+91-9999999999');
    const finalType = emergency_type || 'cardiac';
    const finalTriage = (triage_level && ['RED', 'YELLOW', 'GREEN'].includes(triage_level)) ? triage_level : 'RED';

    // Unique Reference: SOS-YYYYMMDD-XXXX
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const refNo = `SOS-${today}-${randPart}`;

    const stmt = db.prepare(`
      INSERT INTO emergency_requests (
        reference_no, patient_id, patient_name, contact_phone, hospital_id,
        emergency_type, latitude, longitude, address, notes, status, triage_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?)
    `);

    const result = stmt.run(
      refNo,
      patientId,
      finalName,
      finalPhone,
      hospital_id || null,
      finalType,
      typeof latitude === 'number' ? latitude : null,
      typeof longitude === 'number' ? longitude : null,
      address || null,
      notes || null,
      finalTriage
    );

    // Create system notification for hospital
    if (hospital_id) {
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, title_key, message_key, type)
          SELECT id, 'CRITICAL EMERGENCY SOS: ' || ?, 'Patient ' || ? || ' reported ' || ? || ' (Triage ' || ? || '). Phone: ' || ?, 'urgent'
          FROM users WHERE (role = 'hospital_admin' OR role = 'admin') AND (hospital_id = ? OR hospital_id IS NULL)
        `).run(refNo, finalName, finalType, finalTriage, finalPhone, hospital_id);
      } catch (notifErr) {
        console.error('Failed to notify staff of emergency:', notifErr);
      }
    }

    logAudit(
      patientId,
      finalName,
      req.user?.role || 'patient',
      'TRIGGER_EMERGENCY_SOS',
      'emergency_requests',
      String(result.lastInsertRowid),
      `Emergency Ref ${refNo}, Type: ${finalType}, Triage: ${finalTriage}`
    );

    const created = db.prepare(`
      SELECT er.*, h.name as hospital_name, h.emergency_hotline, h.contact_phone as hospital_phone, h.location as hospital_location
      FROM emergency_requests er
      LEFT JOIN hospitals h ON er.hospital_id = h.id
      WHERE er.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Emergency request received by CareSphere Trauma Network.',
      emergency_request: created,
      safety_instructions: [
        'Stay calm and remain in a safe location.',
        'Keep your phone line free so the hospital trauma desk can reach you.',
        'If patient is unconscious or not breathing, dial 108 immediately while assistance is coordinated.'
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit emergency request: ' + err.message });
  }
}

// 5. Patient: Get My Emergency Requests & Active Tracking
export function getMyEmergencyRequests(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const requests = db.prepare(`
      SELECT er.*, h.name as hospital_name, h.location as hospital_location, h.emergency_hotline,
             u.name as assigned_staff_name
      FROM emergency_requests er
      LEFT JOIN hospitals h ON er.hospital_id = h.id
      LEFT JOIN users u ON er.assigned_staff_id = u.id
      WHERE er.patient_id = ?
      ORDER BY er.created_at DESC
    `).all(req.user.id);

    res.json({ requests });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch emergency requests: ' + err.message });
  }
}

// 6. Hospital Admin / Superadmin: Emergency Management Dashboard
export function getHospitalEmergencyRequests(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || !['admin', 'hospital_admin', 'superadmin'].includes(req.user.role)) {
      res.status(403).json({ error: 'Restricted to authorized emergency management staff.' });
      return;
    }

    let query = `
      SELECT er.*, h.name as hospital_name, h.city as hospital_city, h.emergency_hotline,
             u.name as assigned_staff_name
      FROM emergency_requests er
      LEFT JOIN hospitals h ON er.hospital_id = h.id
      LEFT JOIN users u ON er.assigned_staff_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by hospital if user is hospital_admin
    if (req.user.role === 'hospital_admin' && req.user.hospital_id) {
      query += ' AND (er.hospital_id = ? OR er.hospital_id IS NULL)';
      params.push(req.user.hospital_id);
    } else if (req.query.hospital_id) {
      query += ' AND er.hospital_id = ?';
      params.push(Number(req.query.hospital_id));
    }

    if (req.query.status) {
      query += ' AND er.status = ?';
      params.push(req.query.status);
    }

    if (req.query.triage_level) {
      query += ' AND er.triage_level = ?';
      params.push(req.query.triage_level);
    }

    query += ' ORDER BY CASE er.status WHEN "received" THEN 1 WHEN "acknowledged" THEN 2 WHEN "assistance_arranged" THEN 3 ELSE 4 END, er.created_at DESC LIMIT 100';

    const requests = db.prepare(query).all(...params);
    res.json({ requests });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch hospital emergency requests: ' + err.message });
  }
}

// 7. Update Emergency Request Status & Dispatch Details
export function updateEmergencyRequestStatus(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || !['admin', 'hospital_admin', 'superadmin'].includes(req.user.role)) {
      res.status(403).json({ error: 'Restricted to authorized emergency management staff.' });
      return;
    }

    const requestId = Number(req.params.id);
    const { status, dispatched_service, resolution_notes, triage_level } = req.body;

    const validStatuses = ['received', 'acknowledged', 'assistance_arranged', 'resolved', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const existing = db.prepare('SELECT * FROM emergency_requests WHERE id = ?').get(requestId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Emergency request not found.' });
      return;
    }

    db.prepare(`
      UPDATE emergency_requests
      SET status = ?,
          dispatched_service = COALESCE(?, dispatched_service),
          resolution_notes = COALESCE(?, resolution_notes),
          triage_level = COALESCE(?, triage_level),
          assigned_staff_id = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      status,
      dispatched_service || null,
      resolution_notes || null,
      triage_level || null,
      req.user.id,
      requestId
    );

    // Notify patient
    if (existing.patient_id) {
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, title_key, message_key, type)
          VALUES (?, 'Emergency Request Update: ' || ?, ?, 'urgent')
        `).run(
          existing.patient_id,
          existing.reference_no,
          `Status changed to ${status.replace(/_/g, ' ').toUpperCase()}.${dispatched_service ? ' ' + dispatched_service : ''}`
        );
      } catch (notifErr) {
        console.error('Failed to notify patient of emergency update:', notifErr);
      }
    }

    logAudit(
      req.user.id,
      req.user.name,
      req.user.role,
      'UPDATE_EMERGENCY_STATUS',
      'emergency_requests',
      String(requestId),
      `Ref: ${existing.reference_no}, Status: ${status}`
    );

    const updated = db.prepare(`
      SELECT er.*, h.name as hospital_name, u.name as assigned_staff_name
      FROM emergency_requests er
      LEFT JOIN hospitals h ON er.hospital_id = h.id
      LEFT JOIN users u ON er.assigned_staff_id = u.id
      WHERE er.id = ?
    `).get(requestId);

    res.json({ message: 'Emergency request updated successfully.', request: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update emergency status: ' + err.message });
  }
}

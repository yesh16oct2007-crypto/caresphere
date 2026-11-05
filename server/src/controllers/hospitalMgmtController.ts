import { Request, Response } from 'express';
import { db, logAudit } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

// 1. Get All Hospitals (Public)
export function getAllHospitals(req: Request, res: Response): void {
  try {
    const hospitals = db.prepare(`
      SELECT h.*,
             (SELECT COUNT(*) FROM doctor_profiles WHERE hospital_id = h.id AND verification_status IN ('verified', 'approved')) as active_doctors_count
      FROM hospitals h
      WHERE h.is_active = 1
      ORDER BY h.name ASC
    `).all();

    res.json({ hospitals });
  } catch (err: any) {
    console.error('Get all hospitals error:', err);
    res.status(500).json({ error: 'Failed to retrieve hospitals.' });
  }
}

// 2. Super Admin: Create Hospital
export function createHospital(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
      res.status(403).json({ error: 'Only Super Administrators can register new hospital facilities.' });
      return;
    }

    const {
      name,
      code,
      location,
      city,
      state = 'Karnataka',
      address,
      contact_phone,
      contact_email,
      emergency_hotline = '+91-80-CARE-911',
      total_beds = 200
    } = req.body;

    if (!name || !code || !location || !city) {
      res.status(400).json({ error: 'name, code, location, and city are required.' });
      return;
    }

    const stmt = db.prepare(`
      INSERT INTO hospitals (
        name, code, location, city, state, address, contact_phone, contact_email, emergency_hotline, total_beds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name.trim(),
      code.trim().toUpperCase(),
      location.trim(),
      city.trim(),
      state.trim(),
      address || null,
      contact_phone || null,
      contact_email || null,
      emergency_hotline || '+91-80-CARE-911',
      Number(total_beds) || 200
    );

    const hospitalId = Number(result.lastInsertRowid);

    // Auto-create default hospital resources
    const defaultResources = [
      { type: 'general_beds', total: total_beds, avail: Math.round(total_beds * 0.4), occ: Math.round(total_beds * 0.6) },
      { type: 'icu_beds', total: 30, avail: 8, occ: 22 },
      { type: 'emergency_beds', total: 20, avail: 5, occ: 15 },
      { type: 'ambulance', total: 6, avail: 4, occ: 2 },
      { type: 'blood_bank', total: 100, avail: 78, occ: 22 },
      { type: 'lab_services', total: 1, avail: 1, occ: 0 },
      { type: 'pharmacy', total: 1, avail: 1, occ: 0 },
      { type: 'emergency_dept', total: 1, avail: 1, occ: 0 }
    ];

    const insertRes = db.prepare(`
      INSERT INTO hospital_resources (hospital_id, resource_type, total_capacity, available_count, occupied_count, status, updated_at)
      VALUES (?, ?, ?, ?, ?, 'available', datetime('now'))
    `);
    defaultResources.forEach(r => insertRes.run(hospitalId, r.type, r.total, r.avail, r.occ));

    logAudit(
      req.user.id,
      req.user.name,
      req.user.role,
      'CREATE_HOSPITAL',
      'HOSPITALS',
      String(hospitalId),
      `Registered hospital ${name} (${code}) in ${city}`,
      req.ip
    );

    res.status(201).json({
      message: 'Hospital registered successfully with default clinical resources.',
      hospital_id: hospitalId
    });
  } catch (err: any) {
    console.error('Create hospital error:', err);
    res.status(500).json({ error: 'Failed to create hospital.' });
  }
}

// 3. Super Admin or Hospital Admin: Update Hospital Details
export function updateHospital(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || !['admin', 'superadmin', 'hospital_admin'].includes(req.user.role)) {
      res.status(403).json({ error: 'Unauthorized.' });
      return;
    }

    const hospitalId = Number(req.params.id);

    // If hospital_admin, check they are editing their own hospital
    if (req.user.role === 'hospital_admin' && req.user.hospital_id && req.user.hospital_id !== hospitalId) {
      res.status(403).json({ error: 'Forbidden: You can only update your assigned hospital.' });
      return;
    }

    const { name, location, city, address, contact_phone, contact_email, emergency_hotline, total_beds } = req.body;

    db.prepare(`
      UPDATE hospitals
      SET name = COALESCE(?, name),
          location = COALESCE(?, location),
          city = COALESCE(?, city),
          address = COALESCE(?, address),
          contact_phone = COALESCE(?, contact_phone),
          contact_email = COALESCE(?, contact_email),
          emergency_hotline = COALESCE(?, emergency_hotline),
          total_beds = COALESCE(?, total_beds)
      WHERE id = ?
    `).run(
      name || null,
      location || null,
      city || null,
      address || null,
      contact_phone || null,
      contact_email || null,
      emergency_hotline || null,
      total_beds || null,
      hospitalId
    );

    logAudit(
      req.user.id,
      req.user.name,
      req.user.role,
      'UPDATE_HOSPITAL',
      'HOSPITALS',
      String(hospitalId),
      `Updated details for hospital #${hospitalId}`,
      req.ip
    );

    res.json({ message: 'Hospital details updated successfully.' });
  } catch (err: any) {
    console.error('Update hospital error:', err);
    res.status(500).json({ error: 'Failed to update hospital details.' });
  }
}

import { Request, Response } from 'express';
import { db, logAudit } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

// 1. Get Live Hospital Resources (Public / Patient / Doctor / Admin)
export function getLiveResources(req: Request, res: Response): void {
  try {
    const { hospital_id, city, resource_type, search } = req.query;

    let query = `
      SELECT hr.id, hr.hospital_id, hr.resource_type, hr.total_capacity,
             hr.available_count, hr.occupied_count, hr.status, hr.details_json, hr.updated_at,
             h.name as hospital_name, h.location as hospital_location, h.city as hospital_city,
             h.emergency_hotline, h.contact_phone
      FROM hospital_resources hr
      JOIN hospitals h ON hr.hospital_id = h.id
      WHERE h.is_active = 1
    `;
    const params: any[] = [];

    if (hospital_id) {
      query += ` AND hr.hospital_id = ?`;
      params.push(hospital_id);
    }
    if (city) {
      query += ` AND h.city = ?`;
      params.push(city);
    }
    if (resource_type && resource_type !== 'all') {
      query += ` AND hr.resource_type = ?`;
      params.push(resource_type);
    }
    if (search) {
      query += ` AND (h.name LIKE ? OR h.city LIKE ? OR hr.resource_type LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY h.name ASC, hr.resource_type ASC`;

    const rawRows = db.prepare(query).all(...params) as any[];

    const resources = rawRows.map(r => ({
      ...r,
      details: r.details_json ? JSON.parse(r.details_json) : null,
      last_updated_human: r.updated_at ? new Date(r.updated_at).toLocaleString() : 'Availability not confirmed',
      is_stale: !r.updated_at || (Date.now() - new Date(r.updated_at).getTime() > 24 * 60 * 60 * 1000)
    }));

    res.json({ resources });
  } catch (err: any) {
    console.error('Get resources error:', err);
    res.status(500).json({ error: 'Failed to retrieve hospital resources.' });
  }
}

// 2. Get Resources for a Single Hospital (e.g. for Hospital Admin dashboard)
export function getHospitalResources(req: Request, res: Response): void {
  try {
    const hospitalId = Number(req.params.hospitalId);

    const hospital = db.prepare('SELECT id, name, location, city, emergency_hotline, contact_phone FROM hospitals WHERE id = ?').get(hospitalId);
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found.' });
      return;
    }

    const rows = db.prepare(`
      SELECT * FROM hospital_resources WHERE hospital_id = ? ORDER BY resource_type ASC
    `).all(hospitalId) as any[];

    const resources = rows.map(r => ({
      ...r,
      details: r.details_json ? JSON.parse(r.details_json) : null
    }));

    res.json({ hospital, resources });
  } catch (err: any) {
    console.error('Get single hospital resources error:', err);
    res.status(500).json({ error: 'Failed to retrieve resources.' });
  }
}

// 3. Update Resource Availability (Hospital Admin or Super Admin)
export function updateHospitalResource(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || !['admin', 'superadmin', 'hospital_admin'].includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied: Hospital admin privileges required.' });
      return;
    }

    const resourceId = Number(req.params.id);
    const { total_capacity, available_count, occupied_count, status, details } = req.body;

    const resource = db.prepare('SELECT * FROM hospital_resources WHERE id = ?').get(resourceId) as any;
    if (!resource) {
      res.status(404).json({ error: 'Resource record not found.' });
      return;
    }

    // Role check: If hospital_admin, cannot update other hospitals!
    if (req.user.role === 'hospital_admin' && req.user.hospital_id && req.user.hospital_id !== resource.hospital_id) {
      res.status(403).json({ error: 'Forbidden: You can only update resources for your assigned hospital.' });
      return;
    }

    const nowIso = new Date().toISOString();

    db.prepare(`
      UPDATE hospital_resources
      SET total_capacity = COALESCE(?, total_capacity),
          available_count = COALESCE(?, available_count),
          occupied_count = COALESCE(?, occupied_count),
          status = COALESCE(?, status),
          details_json = COALESCE(?, details_json),
          updated_by = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      total_capacity !== undefined ? total_capacity : null,
      available_count !== undefined ? available_count : null,
      occupied_count !== undefined ? occupied_count : null,
      status || null,
      details ? JSON.stringify(details) : null,
      req.user.id,
      nowIso,
      resourceId
    );

    logAudit(
      req.user.id,
      req.user.name,
      req.user.role,
      'UPDATE_RESOURCE',
      'HOSPITAL_RESOURCES',
      String(resourceId),
      `Updated ${resource.resource_type}: available=${available_count}, occupied=${occupied_count}, status=${status}`,
      req.ip
    );

    res.json({
      message: 'Resource availability updated successfully.',
      updated_at: nowIso
    });
  } catch (err: any) {
    console.error('Update resource error:', err);
    res.status(500).json({ error: 'Failed to update resource.' });
  }
}

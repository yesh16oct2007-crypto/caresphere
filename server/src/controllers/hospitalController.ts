import { Request, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export function getHospitalInfo(req: Request, res: Response): void {
  res.json({
    hospital: {
      name: 'CareSphere Multispeciality Hospital',
      tagline: 'Your Health, Your Language, Your Care',
      address: 'Plot 42, Healthcare Boulevard, Electronic City Phase 1, Bengaluru, Karnataka 560100',
      emergency_phone: '+91-80-CARE-911',
      national_emergency: '108 / 112',
      general_enquiry: '+91-80-4911-2000',
      email: 'care@caresphere.health',
      opd_timings: 'Monday to Saturday: 08:00 AM - 08:00 PM',
      emergency_timings: '24 Hours, 365 Days Open',
      visiting_hours: {
        general_wards: '04:00 PM - 07:00 PM',
        icu_wards: '11:00 AM - 12:00 PM & 05:00 PM - 06:00 PM'
      },
      accreditations: ['NABH (National Accreditation Board for Hospitals)', 'NABL (Diagnostic Labs)', 'ISO 9001:2015']
    }
  });
}

export function getDepartments(req: Request, res: Response): void {
  try {
    const departments = db.prepare(`
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM doctor_profiles dp WHERE dp.department_id = d.id AND dp.verification_status = 'approved') as approved_doctors_count
      FROM departments d
      ORDER BY d.name ASC
    `).all();

    res.json({ departments });
  } catch (err: any) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: 'Failed to retrieve departments.' });
  }
}

export function getFacilities(req: Request, res: Response): void {
  try {
    const facilities = db.prepare('SELECT * FROM hospital_facilities ORDER BY is_emergency_facility DESC, name ASC').all();
    res.json({ facilities });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve facilities.' });
  }
}

export function getFaqs(req: Request, res: Response): void {
  try {
    const faqs = db.prepare('SELECT * FROM hospital_faqs ORDER BY category, id').all();
    res.json({ faqs });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve FAQs.' });
  }
}

export function getAnnouncements(req: Request, res: Response): void {
  try {
    const announcements = db.prepare('SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC LIMIT 10').all();
    res.json({ announcements });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve announcements.' });
  }
}

export function getUserNotifications(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(req.user.id);

    const unreadCount = (db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND is_read = 0
    `).get(req.user.id) as any).count;

    res.json({ notifications, unread_count: unreadCount });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
}

export function markNotificationRead(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ message: 'Notification marked as read.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update notification.' });
  }
}

export function markAllNotificationsRead(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
}

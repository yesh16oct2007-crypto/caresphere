import { Request, Response } from 'express';
import { db, logAudit } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

// 1. Get All Insurance Providers
export function getInsuranceProviders(req: Request, res: Response): void {
  try {
    const providers = db.prepare(`
      SELECT ip.*,
             (SELECT COUNT(*) FROM hospital_insurance_partners WHERE insurance_id = ip.id AND is_cashless_enabled = 1) as cashless_hospitals_count
      FROM insurance_providers ip
      ORDER BY ip.is_cashless_network DESC, ip.name ASC
    `).all();

    res.json({ providers });
  } catch (err: any) {
    console.error('Get providers error:', err);
    res.status(500).json({ error: 'Failed to retrieve insurance providers.' });
  }
}

// 2. Get Hospital-Specific Accepted Insurers & TPA Desk Info
export function getHospitalInsuranceInfo(req: Request, res: Response): void {
  try {
    const hospitalId = Number(req.params.hospitalId);

    const hospital = db.prepare('SELECT id, name, location, emergency_hotline FROM hospitals WHERE id = ?').get(hospitalId) as any;
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found.' });
      return;
    }

    const partners = db.prepare(`
      SELECT hip.*, ip.name as provider_name, ip.code as provider_code, ip.toll_free_number,
             ip.website, ip.claim_process_info
      FROM hospital_insurance_partners hip
      JOIN insurance_providers ip ON hip.insurance_id = ip.id
      WHERE hip.hospital_id = ?
      ORDER BY hip.is_cashless_enabled DESC, ip.name ASC
    `).all(hospitalId);

    res.json({
      hospital,
      insurance_partners: partners,
      tpa_helpdesk: {
        location: 'Ground Floor, Block A - Atrium Wing (Room G-14)',
        timings: '24 Hours Open (Emergency Pre-auth Desk)',
        helpline: '+91-80-CARE-INS (ext: 114)',
        email: 'tpa.desk@caresphere.health'
      }
    });
  } catch (err: any) {
    console.error('Get hospital insurance error:', err);
    res.status(500).json({ error: 'Failed to retrieve hospital insurance information.' });
  }
}

// 3. Hospital-Wise Insurance Comparison Matrix
export function getInsuranceComparison(req: Request, res: Response): void {
  try {
    const hospitals = db.prepare('SELECT id, name, location, city FROM hospitals WHERE is_active = 1').all() as any[];
    const providers = db.prepare('SELECT id, name, code, is_cashless_network FROM insurance_providers').all() as any[];

    const partnershipRows = db.prepare(`
      SELECT hospital_id, insurance_id, is_cashless_enabled
      FROM hospital_insurance_partners
    `).all() as any[];

    const matrix: Record<string, boolean> = {};
    partnershipRows.forEach(p => {
      matrix[`${p.hospital_id}_${p.insurance_id}`] = Boolean(p.is_cashless_enabled);
    });

    res.json({
      hospitals,
      providers,
      partnership_matrix: matrix
    });
  } catch (err: any) {
    console.error('Insurance comparison error:', err);
    res.status(500).json({ error: 'Failed to retrieve insurance comparison.' });
  }
}

// 4. Patient: Get Saved Insurance Policies (Policy Vault)
export function getMyPolicies(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'patient') {
      res.status(403).json({ error: 'Only registered patients have policy vaults.' });
      return;
    }

    const policies = db.prepare(`
      SELECT pip.*, ip.name as network_provider_name, ip.toll_free_number
      FROM patient_insurance_policies pip
      LEFT JOIN insurance_providers ip ON pip.insurance_provider_id = ip.id
      WHERE pip.patient_id = ?
      ORDER BY pip.created_at DESC
    `).all(req.user.id);

    res.json({ policies });
  } catch (err: any) {
    console.error('Get policies error:', err);
    res.status(500).json({ error: 'Failed to retrieve insurance policies.' });
  }
}

// 5. Patient: Save New Policy in Vault
export function saveMyPolicy(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'patient') {
      res.status(403).json({ error: 'Only registered patients can save policies.' });
      return;
    }

    const {
      provider_name,
      insurance_provider_id,
      policy_number,
      policy_holder_name,
      tpa_id,
      sum_insured,
      valid_until
    } = req.body;

    if (!provider_name || !policy_number || !policy_holder_name) {
      res.status(400).json({ error: 'Provider name, policy number, and policy holder name are required.' });
      return;
    }

    const stmt = db.prepare(`
      INSERT INTO patient_insurance_policies (
        patient_id, insurance_provider_id, provider_name, policy_number,
        policy_holder_name, tpa_id, sum_insured, valid_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      req.user.id,
      insurance_provider_id || null,
      provider_name.trim(),
      policy_number.trim(),
      policy_holder_name.trim(),
      tpa_id || null,
      sum_insured ? Number(sum_insured) : null,
      valid_until || null
    );

    const policyId = Number(result.lastInsertRowid);

    logAudit(
      req.user.id,
      req.user.name,
      'patient',
      'ADD_INSURANCE_POLICY',
      'PATIENT_POLICIES',
      String(policyId),
      `Saved policy ${policy_number} with ${provider_name}`,
      req.ip
    );

    res.status(201).json({
      message: 'Insurance policy saved securely in your patient vault.',
      policy_id: policyId
    });
  } catch (err: any) {
    console.error('Save policy error:', err);
    res.status(500).json({ error: 'Failed to save policy.' });
  }
}

// 6. Delete Policy from Vault
export function deleteMyPolicy(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'patient') {
      res.status(403).json({ error: 'Unauthorized.' });
      return;
    }

    const policyId = Number(req.params.id);
    db.prepare('DELETE FROM patient_insurance_policies WHERE id = ? AND patient_id = ?').run(policyId, req.user.id);

    res.json({ message: 'Policy removed from vault.' });
  } catch (err: any) {
    console.error('Delete policy error:', err);
    res.status(500).json({ error: 'Failed to remove policy.' });
  }
}

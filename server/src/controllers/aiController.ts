import { Request, Response } from 'express';
import { processChatMessage } from '../services/aiService.js';
import { 
  orchestrateAI, 
  executeDoctorVerificationAgent, 
  OrchestrationRequest 
} from '../services/aiOrchestrator.js';
import { runAutomationCycle } from '../services/automationEngine.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { db } from '../db/database.js';

/**
 * Standard AI chat with emergency detection and verified multilingual knowledge base
 */
export async function chatWithAssistant(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { message, language } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    const targetLang = language || req.user?.preferred_language || 'en';

    const result = await processChatMessage({
      message: message.trim(),
      language: targetLang
    });

    res.json(result);
  } catch (err: any) {
    console.error('AI Controller error:', err);
    res.status(500).json({ 
      error: 'CareSphere AI service encountered an error.',
      reply: 'We are experiencing high traffic. For immediate hospital assistance, please call our 24/7 helpline at +91-80-CARE-911 or visit the reception.',
      is_emergency: false
    });
  }
}

/**
 * Central AI Orchestrator Endpoint
 * Dispatches to the 9 specialized agents: patient, doctor, admin, appointment, pharmacy, report, emergency, analytics, operations
 */
export async function orchestrateAgents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { agent_type = 'patient', message, language, hospital_id, payload } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Message content is required for AI agent dispatch.' });
      return;
    }

    // Role-based scoping & hospital isolation
    let scopedHospitalId = hospital_id;
    if (req.user?.role === 'hospital_admin') {
      scopedHospitalId = req.user.hospital_id;
    }

    const orchestrationReq: OrchestrationRequest = {
      agent_type,
      message: message.trim(),
      context: {
        hospital_id: scopedHospitalId,
        user: req.user ? {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          hospital_id: req.user.hospital_id,
          preferred_language: req.user.preferred_language
        } : undefined,
        language: language || req.user?.preferred_language || 'en'
      },
      payload
    };

    const response = await orchestrateAI(orchestrationReq);
    res.json(response);
  } catch (err: any) {
    console.error('AI Orchestrator API error:', err);
    res.status(500).json({ error: 'Failed to process request through Central AI Orchestrator.' });
  }
}

/**
 * Conversational AI Assistant for Hospital Administrators
 * Strictly isolates data by req.user.hospital_id
 */
export async function hospitalAdminAssistant(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { message, language } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Inquiry message is required for Hospital Admin Assistant.' });
      return;
    }

    const isHospitalAdmin = req.user?.role === 'hospital_admin';
    const targetHospitalId = isHospitalAdmin ? req.user!.hospital_id : (Number(req.body.hospital_id) || req.user?.hospital_id || 1);

    if (isHospitalAdmin && !targetHospitalId) {
      res.status(403).json({ error: 'Hospital Admin account has no assigned hospital.' });
      return;
    }

    const response = await orchestrateAI({
      agent_type: 'admin',
      message: message.trim(),
      context: {
        hospital_id: targetHospitalId,
        user: req.user ? {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          hospital_id: targetHospitalId,
          preferred_language: req.user.preferred_language
        } : undefined,
        language: language || req.user?.preferred_language || 'en'
      }
    });

    res.json(response);
  } catch (err: any) {
    console.error('Hospital Admin Assistant error:', err);
    res.status(500).json({ error: 'Failed to process administrative AI request.' });
  }
}

/**
 * Trigger / retrieve AI Doctor Verification
 */
export async function verifyDoctorAI(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const doctorProfileId = Number(req.params.id);
    if (!doctorProfileId) {
      res.status(400).json({ error: 'Valid Doctor Profile ID is required.' });
      return;
    }

    // Verify hospital isolation for hospital_admin
    const doc = db.prepare('SELECT id, hospital_id FROM doctor_profiles WHERE id = ?').get(doctorProfileId) as any;
    if (!doc) {
      res.status(404).json({ error: 'Doctor profile not found.' });
      return;
    }

    if (req.user?.role === 'hospital_admin' && req.user.hospital_id !== doc.hospital_id) {
      res.status(403).json({ error: 'Access denied: Cannot verify doctor belonging to another hospital.' });
      return;
    }

    const report = await executeDoctorVerificationAgent(doctorProfileId, doc.hospital_id);
    res.json({ success: true, verification_report: report });
  } catch (err: any) {
    console.error('Error verifying doctor via AI:', err);
    res.status(500).json({ error: err.message || 'Failed to complete AI doctor verification.' });
  }
}

/**
 * Get stored AI Verification Report for a doctor
 */
export function getDoctorVerificationReport(req: AuthenticatedRequest, res: Response): void {
  try {
    const doctorProfileId = Number(req.params.id);
    if (!doctorProfileId) {
      res.status(400).json({ error: 'Doctor profile ID is required.' });
      return;
    }

    const doc = db.prepare('SELECT id, hospital_id, user_id FROM doctor_profiles WHERE id = ?').get(doctorProfileId) as any;
    if (!doc) {
      res.status(404).json({ error: 'Doctor profile not found.' });
      return;
    }

    // Role check: superadmin, hospital_admin of matching hospital, or the doctor themselves
    if (req.user?.role === 'hospital_admin' && req.user.hospital_id !== doc.hospital_id) {
      res.status(403).json({ error: 'Access denied: Cannot access reports of doctors from other hospitals.' });
      return;
    }
    if (req.user?.role === 'doctor' && req.user.id !== doc.user_id) {
      res.status(403).json({ error: 'Access denied: You can only view your own verification report.' });
      return;
    }

    let report = db.prepare(`
      SELECT * FROM doctor_ai_verification_reports WHERE doctor_id = ?
    `).get(doctorProfileId) as any;

    // If report does not exist yet, generate it autonomously now
    if (!report) {
      executeDoctorVerificationAgent(doctorProfileId, doc.hospital_id)
        .then(rep => {
          res.json({
            report: {
              ...rep,
              flags: rep.flags,
              checklist: rep.checklist
            }
          });
        })
        .catch(genErr => {
          res.status(500).json({ error: 'Failed to generate initial AI verification report.' });
        });
      return;
    }

    res.json({
      report: {
        ...report,
        council_valid: Boolean(report.council_valid),
        duplicate_detected: Boolean(report.duplicate_detected),
        flags: report.flags_json ? JSON.parse(report.flags_json) : [],
        checklist: report.checklist_json ? JSON.parse(report.checklist_json) : {}
      }
    });
  } catch (err: any) {
    console.error('Error fetching verification report:', err);
    res.status(500).json({ error: 'Failed to retrieve AI verification report.' });
  }
}

/**
 * Get Hospital-Specific Strategic Recommendations
 */
export function getHospitalRecommendations(req: AuthenticatedRequest, res: Response): void {
  try {
    const isHospitalAdmin = req.user?.role === 'hospital_admin';
    const targetHospitalId = isHospitalAdmin ? req.user!.hospital_id : (Number(req.query.hospital_id) || req.user?.hospital_id || 1);

    if (isHospitalAdmin && !targetHospitalId) {
      res.status(403).json({ error: 'Hospital admin is not assigned to a hospital.' });
      return;
    }

    let recs = db.prepare(`
      SELECT * FROM ai_hospital_recommendations
      WHERE hospital_id = ?
      ORDER BY 
        CASE priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        created_at DESC
    `).all(targetHospitalId) as any[];

    if (recs.length === 0) {
      const defaultRecs = [
        {
          category: 'operations',
          title: 'Optimize OPD Morning Slot Distribution',
          description: 'Morning slots (09:00 - 11:30 AM) experience 85% peak occupancy. Recommend opening 2 additional consultation chambers.',
          priority: 'high',
          impact: 'Reduces patient waiting time by ~22 minutes.'
        },
        {
          category: 'pharmacy',
          title: 'Maintain Buffer Stock for Essential Antibiotics & Antipyretics',
          description: 'Paracetamol and Amoxicillin turnover rates increased by 18% over the past fortnight.',
          priority: 'medium',
          impact: 'Prevents prescription fulfillment delays.'
        },
        {
          category: 'clinical',
          title: 'Expand Teleconsultation Availability',
          description: 'Follow-up patient inquiries indicate high interest in virtual review visits for post-discharge patients.',
          priority: 'medium',
          impact: 'Frees up in-person chambers for acute cases.'
        }
      ];
      const ins = db.prepare('INSERT INTO ai_hospital_recommendations (hospital_id, category, title, description, priority, impact) VALUES (?, ?, ?, ?, ?, ?)');
      for (const r of defaultRecs) {
        ins.run(targetHospitalId, r.category, r.title, r.description, r.priority, r.impact);
      }
      recs = db.prepare('SELECT * FROM ai_hospital_recommendations WHERE hospital_id = ?').all(targetHospitalId) as any[];
    }

    res.json({ recommendations: recs, hospital_id: targetHospitalId });
  } catch (err: any) {
    console.error('Error fetching hospital recommendations:', err);
    res.status(500).json({ error: 'Failed to retrieve recommendations.' });
  }
}

/**
 * Trigger manual execution of autonomous operations cycle
 */
export async function triggerAutomationCycle(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const isHospitalAdmin = req.user?.role === 'hospital_admin';
    const targetHospitalId = isHospitalAdmin ? req.user!.hospital_id : (req.body.hospital_id ? Number(req.body.hospital_id) : undefined);

    const result = await runAutomationCycle(targetHospitalId || undefined);
    res.json({
      success: true,
      message: 'Autonomous operations cycle completed successfully.',
      result
    });
  } catch (err: any) {
    console.error('Automation execution error:', err);
    res.status(500).json({ error: 'Failed to execute automation cycle.' });
  }
}

/**
 * Get automation audit execution logs
 */
export function getAutomationLogs(req: AuthenticatedRequest, res: Response): void {
  try {
    const isHospitalAdmin = req.user?.role === 'hospital_admin';
    const targetHospitalId = isHospitalAdmin ? req.user!.hospital_id : (req.query.hospital_id ? Number(req.query.hospital_id) : null);

    let query = 'SELECT * FROM automation_job_logs';
    const params: any[] = [];

    if (targetHospitalId) {
      query += ' WHERE hospital_id = ? OR hospital_id IS NULL';
      params.push(targetHospitalId);
    }

    query += ' ORDER BY executed_at DESC LIMIT 50';

    const logs = db.prepare(query).all(...params) as any[];
    res.json({ logs });
  } catch (err: any) {
    console.error('Error fetching automation logs:', err);
    res.status(500).json({ error: 'Failed to retrieve automation logs.' });
  }
}

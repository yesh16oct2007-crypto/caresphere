import { Request, Response } from 'express';
import { processChatMessage } from '../services/aiService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export async function chatWithAssistant(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { message, language } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    // Determine target language: body -> user profile -> header/default 'en'
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

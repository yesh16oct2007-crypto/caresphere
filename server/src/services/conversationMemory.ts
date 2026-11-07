import { db } from '../db/database.js';

export interface ConversationTurn {
  id: number;
  session_id: string;
  user_id: number | null;
  role: 'user' | 'assistant' | 'system';
  message: string;
  language: string;
  action_executed?: string | null;
  context_json?: string | null;
  created_at: string;
}

export interface SessionContext {
  referenced_appointments?: { index: number; id: number; doctor_name: string; date: string; time: string }[];
  pending_action?: {
    action: string;
    params: any;
    prompt_in_lang: string;
  };
  last_topic?: string;
}

/**
 * Save a conversation message turn into persistent database memory
 */
export function saveConversationMessage(
  sessionId: string,
  userId: number | null,
  role: 'user' | 'assistant' | 'system',
  message: string,
  language: string = 'en',
  actionExecuted: string | null = null,
  contextData: SessionContext | null = null
): void {
  try {
    db.prepare(`
      INSERT INTO ai_conversations (
        session_id, user_id, role, message, language, action_executed, context_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      userId || null,
      role,
      message,
      language,
      actionExecuted || null,
      contextData ? JSON.stringify(contextData) : null
    );
  } catch (err) {
    console.error('Failed to save AI conversation turn:', err);
  }
}

/**
 * Retrieve recent conversation history for multi-turn context
 */
export function getConversationHistory(sessionId: string, limit: number = 6): { role: 'user' | 'assistant'; content: string }[] {
  try {
    const rows = db.prepare(`
      SELECT role, message
      FROM ai_conversations
      WHERE session_id = ?
      ORDER BY id DESC
      LIMIT ?
    `).all(sessionId, limit) as { role: 'user' | 'assistant'; message: string }[];

    return rows.reverse().map(r => ({
      role: r.role === 'assistant' ? 'assistant' : 'user',
      content: r.message
    }));
  } catch (err) {
    console.error('Failed to load conversation history:', err);
    return [];
  }
}

/**
 * Retrieve the latest active session context (e.g. referenced appointments, pending confirmation)
 */
export function getLatestContext(sessionId: string): SessionContext | null {
  try {
    const row = db.prepare(`
      SELECT context_json
      FROM ai_conversations
      WHERE session_id = ? AND context_json IS NOT NULL
      ORDER BY id DESC
      LIMIT 1
    `).get(sessionId) as { context_json: string } | undefined;

    if (!row || !row.context_json) return null;
    return JSON.parse(row.context_json) as SessionContext;
  } catch (err) {
    console.error('Failed to parse latest conversation context:', err);
    return null;
  }
}

/**
 * Clear session memory
 */
export function clearSessionMemory(sessionId: string): void {
  try {
    db.prepare('DELETE FROM ai_conversations WHERE session_id = ?').run(sessionId);
  } catch (err) {
    console.error('Failed to clear conversation memory:', err);
  }
}

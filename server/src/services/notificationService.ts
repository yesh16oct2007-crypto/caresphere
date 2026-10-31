import { db } from '../db/database.js';

export function createNotification(
  userId: number,
  titleKey: string,
  messageKey: string,
  params: Record<string, any> = {},
  type: 'info' | 'appointment' | 'alert' | 'success' = 'info'
): void {
  try {
    const stmt = db.prepare(`
      INSERT INTO notifications (user_id, title_key, message_key, params, type)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(userId, titleKey, messageKey, JSON.stringify(params), type);
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

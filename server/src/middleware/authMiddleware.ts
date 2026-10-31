import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'caresphere-secure-jwt-secret-key-2026';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  preferred_language: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required. Please sign in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    
    // Verify user still exists in database
    const user = db.prepare('SELECT id, name, email, role, preferred_language FROM users WHERE id = ?').get(decoded.id) as AuthUser | undefined;
    
    if (!user) {
      res.status(401).json({ error: 'User account no longer exists.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired session token. Please log in again.' });
  }
}

export function requireRole(allowedRoles: ('patient' | 'doctor' | 'admin')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        error: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]. Your role is '${req.user.role}'.` 
      });
      return;
    }

    next();
  };
}

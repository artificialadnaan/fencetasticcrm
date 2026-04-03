import jwt from 'jsonwebtoken';
import { JWT_EXPIRY } from '@fencetastic/shared';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const SECRET = JWT_SECRET || 'dev-secret-change-me';

export interface JwtPayload {
  userId: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}

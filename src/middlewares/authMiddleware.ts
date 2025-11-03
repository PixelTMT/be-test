import { Request, Response, NextFunction } from 'express';
import { AuthService } from '$services/AuthService';
import { UserJWTDAO } from '$entities/User';
import { AUTH_MESSAGES } from '$entities/Auth';
import Logger from '$pkg/logger';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserJWTDAO;
    }
  }
}

/**
 * Authentication middleware that verifies JWT tokens
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: AUTH_MESSAGES.TOKEN_REQUIRED
      });
    }

    // Verify token
    const authResponse = await AuthService.verifyToken(token);

    if (!authResponse.status || !authResponse.data) {
      return res.status(401).json({
        success: false,
        message: authResponse.error || AUTH_MESSAGES.INVALID_TOKEN
      });
    }

    // Add user to request object
    req.user = authResponse.data;
    next();
  } catch (error) {
    Logger.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: AUTH_MESSAGES.INVALID_TOKEN
    });
  }
}

/**
 * Admin role middleware - requires ADMIN role
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: AUTH_MESSAGES.TOKEN_REQUIRED
      });
    }

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: AUTH_MESSAGES.UNAUTHORIZED
      });
    }

    next();
  } catch (error) {
    Logger.error('Admin middleware error:', error);
    return res.status(403).json({
      success: false,
      message: AUTH_MESSAGES.UNAUTHORIZED
    });
  }
}

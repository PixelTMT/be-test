import { Request, Response } from 'express';
import { AuthService } from '$services/AuthService';
import { LoginRequestDTO, RegisterRequestDTO } from '$entities/Auth';
import { response_success } from '$utils/response.utils';
import Logger from '$pkg/logger';

/**
 * Register a new user
 * POST /auth/register
 */
export async function register(req: Request, res: Response): Promise<Response> {
  try {
    const registerData: RegisterRequestDTO = {
      email: req.body.email,
      password: req.body.password,
      fullName: req.body.fullName
    };

    // Validate required fields
    if (!registerData.email || !registerData.password || !registerData.fullName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and fullName are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerData.email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate password strength
    if (registerData.password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const serviceResponse = await AuthService.register(registerData);

    if (!serviceResponse.status) {
      return res.status(400).json({
        success: false,
        message: serviceResponse.error
      });
    }

    return response_success(res, serviceResponse.data, serviceResponse.message);
  } catch (error) {
    Logger.error('AuthController.register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Login user
 * POST /auth/login
 */
export async function login(req: Request, res: Response): Promise<Response> {
  try {
    const loginData: LoginRequestDTO = {
      email: req.body.email,
      password: req.body.password
    };

    // Validate required fields
    if (!loginData.email || !loginData.password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const serviceResponse = await AuthService.login(loginData);

    if (!serviceResponse.status) {
      return res.status(401).json({
        success: false,
        message: serviceResponse.error
      });
    }

    return response_success(res, serviceResponse.data, serviceResponse.message);
  } catch (error) {
    Logger.error('AuthController.login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get current user profile
 * GET /auth/me
 */
export async function getProfile(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userData = {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role
    };

    return response_success(res, userData, 'User profile retrieved successfully');
  } catch (error) {
    Logger.error('AuthController.getProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Verify token (health check for auth)
 * GET /auth/verify
 */
export async function verifyToken(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    return response_success(res, {
      valid: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName,
        role: req.user.role
      }
    }, 'Token is valid');
  } catch (error) {
    Logger.error('AuthController.verifyToken error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

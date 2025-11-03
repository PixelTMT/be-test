import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  LoginRequestDTO,
  RegisterRequestDTO,
  AuthResponseDTO,
  AuthServiceResponse,
  TokenPayload,
  AUTH_MESSAGES
} from '$entities/Auth';
import { UserJWTDAO } from '$entities/User';
import Logger from '$pkg/logger';
import { prisma } from '$utils/prisma.utils';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_EXPIRY = '7d';
const SALT_ROUNDS = 10;

export class AuthService {
  /**
   * Register a new user
   */
  static async register(userData: RegisterRequestDTO): Promise<AuthServiceResponse<AuthResponseDTO>> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        return {
          status: false,
          error: AUTH_MESSAGES.EMAIL_ALREADY_EXISTS
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          fullName: userData.fullName,
          password: hashedPassword,
          role: 'USER'
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // Generate JWT token
      const token = this.generateToken({
        userId: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role
      });

      // Return response with user data (excluding password)
      const userResponse: UserJWTDAO = {
        id: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role
      };

      return {
        status: true,
        data: {
          user: userResponse,
          token
        },
        message: AUTH_MESSAGES.REGISTER_SUCCESS
      };
    } catch (error) {
      Logger.error('AuthService.register error:', error);
      return {
        status: false,
        error: "Internal Server Error"
      };
    }
  }

  /**
   * Login user
   */
  static async login(loginData: LoginRequestDTO): Promise<AuthServiceResponse<AuthResponseDTO>> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: loginData.email }
      });

      if (!user) {
        return {
          status: false,
          error: AUTH_MESSAGES.INVALID_CREDENTIALS
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(loginData.password, user.password);

      if (!isPasswordValid) {
        return {
          status: false,
          error: AUTH_MESSAGES.INVALID_CREDENTIALS
        };
      }

      // Generate JWT token
      const token = this.generateToken({
        userId: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role
      });

      // Return response with user data (excluding password)
      const userResponse: UserJWTDAO = {
        id: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role
      };

      return {
        status: true,
        data: {
          user: userResponse,
          token
        },
        message: AUTH_MESSAGES.LOGIN_SUCCESS
      };
    } catch (error) {
      Logger.error('AuthService.login error:', error);
      return {
        status: false,
        error: "Internal Server Error"
      };
    }
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<AuthServiceResponse<UserJWTDAO>> {
    try {
      if (!token) {
        return {
          status: false,
          error: AUTH_MESSAGES.TOKEN_REQUIRED
        };
      }

      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace('Bearer ', '');

      const decoded = jwt.verify(cleanToken, JWT_SECRET) as TokenPayload;

      // Check if user still exists
      const user = await prisma.user.findUnique({
        where: { id: parseInt(decoded.userId) }
      });

      if (!user) {
        return {
          status: false,
          error: AUTH_MESSAGES.INVALID_TOKEN
        };
      }

      // Return user data
      const userResponse: UserJWTDAO = {
        id: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role
      };

      return {
        status: true,
        data: userResponse
      };
    } catch (error) {
      Logger.error('AuthService.verifyToken error:', error);
      return {
        status: false,
        error: AUTH_MESSAGES.INVALID_TOKEN
      };
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<AuthServiceResponse<UserJWTDAO>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return {
          status: false,
          error: AUTH_MESSAGES.USER_NOT_FOUND
        };
      }

      const userResponse: UserJWTDAO = {
        id: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role
      };

      return {
        status: true,
        data: userResponse
      };
    } catch (error) {
      Logger.error('AuthService.getUserById error:', error);
      return {
        status: false,
        error: "Internal Server Error"
      };
    }
  }

  /**
   * Generate JWT token
   */
  private static generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  }
}

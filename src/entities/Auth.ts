import { UserJWTDAO } from "./User";

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface RegisterRequestDTO {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponseDTO {
  user: UserJWTDAO;
  token: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  fullName: string;
  role: string;
}

export interface AuthServiceResponse<T> {
  status: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export const AUTH_MESSAGES = {
  LOGIN_SUCCESS: "Login successful",
  REGISTER_SUCCESS: "Registration successful",
  USER_NOT_FOUND: "User not found",
  INVALID_CREDENTIALS: "Invalid email or password",
  EMAIL_ALREADY_EXISTS: "Email already exists",
  VALIDATION_ERROR: "Validation error",
  TOKEN_REQUIRED: "Authorization token is required",
  INVALID_TOKEN: "Invalid or expired token",
  UNAUTHORIZED: "Unauthorized access"
} as const;

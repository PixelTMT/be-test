import { Router } from "express";
import * as AuthController from "$controllers/rest/AuthController";
import { authenticateToken } from "$middlewares/authMiddleware";

const AuthRoutes = Router({ mergeParams: true });

// Public routes (no authentication required)
AuthRoutes.post("/register", AuthController.register);
AuthRoutes.post("/login", AuthController.login);

// Protected routes (authentication required)
AuthRoutes.get("/me", authenticateToken, AuthController.getProfile);
AuthRoutes.get("/verify", authenticateToken, AuthController.verifyToken);

export default AuthRoutes;

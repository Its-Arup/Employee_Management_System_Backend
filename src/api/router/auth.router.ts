import { Router } from 'express';
import { authController } from '../controller/auth.controller';
import { authenticate, validateLogin, validateRefreshToken } from '../middleware';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get access token
 * @access  Public
 */
router.post('/login', validateLogin, authController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', validateRefreshToken, authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private (Authenticated)
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private (Authenticated)
 */
router.get('/me', authenticate, authController.me);

export default router;

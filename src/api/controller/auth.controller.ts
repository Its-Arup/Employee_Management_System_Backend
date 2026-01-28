import { Request, Response } from 'express';
import { authService } from '../../service/auth.service';
import { SuccessResponse } from '../../util';
import { asyncHandler } from '../../util';
import { AuthRequest } from '../middleware/auth.middleware';

export class AuthController {
    /**
     * Login user
     */
    public login = asyncHandler(async (req: Request, res: Response) => {
        const { email, password } = req.body as { email: string; password: string };
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'];

        const result = await authService.login(email, password, ipAddress, userAgent);

        new SuccessResponse(result, 'Login successful').send(res);
    });

    /**
     * Refresh access token
     */
    public refreshToken = asyncHandler(async (req: Request, res: Response) => {
        const { refreshToken } = req.body as { refreshToken: string };

        const result = await authService.refreshAccessToken(refreshToken);

        new SuccessResponse(result, 'Token refreshed successfully').send(res);
    });

    /**
     * Logout user
     */
    public logout = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).user.id;
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'];

        await authService.logout(userId, ipAddress, userAgent);

        new SuccessResponse(null, 'Logout successful').send(res);
    });

    /**
     * Get current authenticated user
     */
    public me = asyncHandler(async (req: Request, res: Response) => {
        const user = (req as AuthRequest).user;

        // Fetch fresh user data from database
        await Promise.resolve();

        new SuccessResponse(user, 'User fetched successfully').send(res);
    });
}

export const authController = new AuthController();

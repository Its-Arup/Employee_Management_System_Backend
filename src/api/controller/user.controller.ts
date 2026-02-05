import { Request, Response } from 'express';
import { userService } from '../../service/user.service';
import { SuccessResponse } from '../../util';
import { asyncHandler } from '../../util';
import { AuthRequest } from '../middleware/auth.middleware';

export class UserController {
    /**
     * Register a new user (Public)
     */
    public register = asyncHandler(async (req: Request, res: Response) => {
        const { username, email, password, displayName, dateOfBirth, phoneNumber, address } = req.body as {
            username: string;
            email: string;
            password: string;
            displayName: string;
            dateOfBirth?: Date;
            phoneNumber?: string;
            address?: string;
        };

        const user = await userService.createUser({
            username,
            email,
            password,
            displayName,
            dateOfBirth,
            phoneNumber,
            address
        });

        new SuccessResponse(
            {
                userId: user._id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                status: user.status,
                isEmailVerified: user.isEmailVerified
            },
            'Registration successful. Please check your email to verify your account.'
        ).send(res);
    });

    /**
     * Get current user profile (Authenticated)
     */
    public getProfile = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).user.id;

        const user = await userService.getUserById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        new SuccessResponse(user, 'User profile fetched successfully').send(res);
    });

    /**
     * Update current user profile (Authenticated)
     */
    public updateProfile = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).user.id;
        const updateData = req.body as Record<string, unknown>;

        const user = await userService.updateUser(userId, updateData, userId);

        new SuccessResponse(user, 'Profile updated successfully').send(res);
    });

    /**
     * Change password (Authenticated)
     */
    public changePassword = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).user.id;
        const { currentPassword, newPassword } = req.body as {
            currentPassword: string;
            newPassword: string;
        };

        await userService.updatePassword(userId, currentPassword, newPassword);

        new SuccessResponse(null, 'Password changed successfully').send(res);
    });

    /**
     * Get all users (Admin/HR)
     */
    public getAllUsers = asyncHandler(async (req: Request, res: Response) => {
        const { status, role, department, page, limit, search } = req.query;

        const result = await userService.getAllUsers({
            status: status as string,
            role: role as string,
            department: department as string,
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            search: search as string
        });

        new SuccessResponse(result, 'Users fetched successfully').send(res);
    });

    /**
     * Get user by ID (Admin/HR)
     */
    public getUserById = asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;

        const user = await userService.getUserById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        new SuccessResponse(user, 'User fetched successfully').send(res);
    });

    /**
     * Get pending user requests (Admin/HR)
     */
    public getPendingUsers = asyncHandler(async (req: Request, res: Response) => {
        const users = await userService.getPendingUsers();

        new SuccessResponse(users, 'Pending users fetched successfully').send(res);
    });

    /**
     * Approve user (Admin/HR)
     */
    public approveUser = asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const adminId = (req as AuthRequest).user.id;
        const { roles, employeeId, designation, department, joiningDate } = req.body as {
            roles: ('employee' | 'admin' | 'hr' | 'manager')[];
            employeeId?: string;
            designation?: string;
            department?: string;
            joiningDate?: string;
        };

        const user = await userService.approveUser(
            userId,
            adminId,
            roles,
            employeeId,
            designation,
            department,
            joiningDate ? new Date(joiningDate) : undefined
        );

        new SuccessResponse(user, 'User approved successfully').send(res);
    });

    /**
     * Reject user (Admin/HR)
     */
    public rejectUser = asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const adminId = (req as AuthRequest).user.id;
        const { reason } = req.body as { reason: string };

        const user = await userService.rejectUser(userId, adminId, reason);

        new SuccessResponse(user, 'User rejected successfully').send(res);
    });

    /**
     * Update user (Admin/HR)
     */
    public updateUser = asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const adminId = (req as AuthRequest).user.id;
        const updateData = req.body as Record<string, unknown>;

        const user = await userService.updateUser(userId, updateData, adminId);

        new SuccessResponse(user, 'User updated successfully').send(res);
    });

    /**
     * Update user roles (Admin only)
     */
    public updateUserRoles = asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const adminId = (req as AuthRequest).user.id;
        const { roles } = req.body as { roles: ('employee' | 'admin' | 'hr' | 'manager')[] };

        const user = await userService.updateUserRoles(userId, roles, adminId);

        new SuccessResponse(user, 'User roles updated successfully').send(res);
    });

    /**
     * Suspend/Activate user (Admin/HR)
     */
    public toggleUserStatus = asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const adminId = (req as AuthRequest).user.id;
        const { status } = req.body as { status: 'active' | 'suspended' };

        const user = await userService.toggleUserStatus(userId, adminId, status);

        new SuccessResponse(user, `User ${status} successfully`).send(res);
    });

    /**
     * Delete user (Admin only)
     */
    public deleteUser = asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const adminId = (req as AuthRequest).user.id;

        await userService.deleteUser(userId, adminId);

        new SuccessResponse(null, 'User deleted successfully').send(res);
    });

    /**
     * Verify email with OTP
     */
    public verifyEmail = asyncHandler(async (req: Request, res: Response) => {
        const { otp } = req.body as { otp: string };

        const user = await userService.verifyEmail(otp);

        new SuccessResponse(
            {
                userId: user._id,
                email: user.email,
                isEmailVerified: user.isEmailVerified
            },
            'Email verified successfully. Please wait for admin approval.'
        ).send(res);
    });

    /**
     * Resend verification email
     */
    public resendVerificationEmail = asyncHandler(async (req: Request, res: Response) => {
        const { email } = req.body as { email: string };

        await userService.resendVerificationEmail(email);

        new SuccessResponse(null, 'Verification email sent successfully').send(res);
    });
}

export const userController = new UserController();

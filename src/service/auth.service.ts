import jwt from 'jsonwebtoken';
import { userService } from './user.service';
import { ENV } from '../constant';
import { createAuditLog, type UserDocument } from '../model';
import { Types } from 'mongoose';

export class AuthService {
    /**
     * Generate access token
     */
    generateAccessToken(user: UserDocument): string {
        return jwt.sign(
            {
                id: String(user._id),
                email: user.email,
                roles: user.roles
            },
            ENV.JWT_SECRET,
            { expiresIn: '1d' }
        );
    }

    /**
     * Generate refresh token
     */
    generateRefreshToken(user: UserDocument): string {
        return jwt.sign(
            {
                id: String(user._id),
                email: user.email
            },
            ENV.JWT_SECRET,
            { expiresIn: '7d' }
        );
    }

    /**
     * Login user
     */
    async login(
        email: string,
        password: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<{
        user: {
            id: string;
            username: string;
            email: string;
            displayName: string;
            roles: string[];
            status: string;
        };
        accessToken: string;
        refreshToken: string;
    }> {
        // Verify credentials
        const user = await userService.verifyPassword(email, password);

        if (!user) {
            // Log failed attempt
            await createAuditLog({
                performedBy: new Types.ObjectId('000000000000000000000000'),
                action: 'LOGIN_FAILED',
                module: 'auth',
                entityType: 'User',
                status: 'failure',
                errorMessage: 'Invalid email or password',
                ipAddress,
                userAgent,
                metadata: { email }
            });

            throw new Error('Invalid email or password');
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
            await createAuditLog({
                userId: new Types.ObjectId(String(user._id)),
                performedBy: new Types.ObjectId(String(user._id)),
                action: 'LOGIN_FAILED',
                module: 'auth',
                entityType: 'User',
                status: 'failure',
                errorMessage: 'Email not verified',
                ipAddress,
                userAgent,
                metadata: { email }
            });

            throw new Error('Please verify your email before logging in. Check your email for the verification link.');
        }

        // Check if user is active
        if (user.status !== 'active') {
            await createAuditLog({
                userId: new Types.ObjectId(String(user._id)),
                performedBy: new Types.ObjectId(String(user._id)),
                action: 'LOGIN_FAILED',
                module: 'auth',
                entityType: 'User',
                status: 'failure',
                errorMessage: `Account is ${user.status}`,
                ipAddress,
                userAgent,
                metadata: { email, status: user.status }
            });

            throw new Error(
                `Your account is ${user.status}. ${user.status === 'pending' ? 'Please wait for admin approval.' : 'Please contact administrator.'}`
            );
        }

        // Generate tokens
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);

        // Log successful login
        await createAuditLog({
            userId: new Types.ObjectId(String(user._id)),
            performedBy: new Types.ObjectId(String(user._id)),
            action: 'LOGIN_SUCCESS',
            module: 'auth',
            entityType: 'User',
            status: 'success',
            ipAddress,
            userAgent,
            metadata: { email }
        });

        return {
            user: {
                id: String(user._id),
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                roles: user.roles,
                status: user.status
            },
            accessToken,
            refreshToken
        };
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }> {
        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, ENV.JWT_SECRET) as {
                id: string;
                email: string;
            };

            // Get user
            const user = await userService.getUserById(decoded.id);

            if (!user) {
                throw new Error('User not found');
            }

            if (user.status !== 'active') {
                throw new Error('Account is not active');
            }

            // Generate new tokens
            const newAccessToken = this.generateAccessToken(user);
            const newRefreshToken = this.generateRefreshToken(user);

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            };
        } catch {
            throw new Error('Invalid or expired refresh token');
        }
    }

    /**
     * Logout user
     */
    async logout(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
        // Log logout
        await createAuditLog({
            userId: new Types.ObjectId(userId),
            performedBy: new Types.ObjectId(userId),
            action: 'LOGOUT',
            module: 'auth',
            entityType: 'User',
            status: 'success',
            ipAddress,
            userAgent
        });
    }

    /**
     * Verify token
     */
    verifyToken(token: string): { id: string; email: string; roles?: string[] } {
        try {
            return jwt.verify(token, ENV.JWT_SECRET) as {
                id: string;
                email: string;
                roles?: string[];
            };
        } catch {
            throw new Error('Invalid or expired token');
        }
    }
}

export const authService = new AuthService();

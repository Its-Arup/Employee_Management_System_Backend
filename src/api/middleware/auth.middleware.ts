import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../../constant';
import { userService } from '../../service/user.service';
import { AuthFailureResponse } from '../../util';

export interface AuthRequest extends Request {
    user: {
        id: string;
        email: string;
        roles: string[];
        status: string;
    };
}

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            new AuthFailureResponse('No token provided').send(res);
            return;
        }

        const decoded = jwt.verify(token, ENV.JWT_SECRET) as {
            id: string;
            email: string;
            roles: string[];
        };

        // Fetch user to verify they still exist and are active
        const user = await userService.getUserById(decoded.id);

        if (!user) {
            new AuthFailureResponse('User not found').send(res);
            return;
        }

        if (user.status !== 'active') {
            new AuthFailureResponse(`Account is ${user.status}. Please contact administrator.`).send(res);
            return;
        }

        // Attach user to request
        (req as AuthRequest).user = {
            id: String(user._id),
            email: user.email,
            roles: user.roles,
            status: user.status
        };

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            new AuthFailureResponse('Token expired').send(res);
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            new AuthFailureResponse('Invalid token').send(res);
            return;
        }
        new AuthFailureResponse('Authentication failed').send(res);
    }
};

/**
 * Check if user has required roles
 */
export const authorize = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = (req as AuthRequest).user;

        if (!user) {
            new AuthFailureResponse('Unauthorized').send(res);
            return;
        }

        const hasRole = user.roles.some(role => allowedRoles.includes(role));

        if (!hasRole) {
            new AuthFailureResponse(`Access denied. Required roles: ${allowedRoles.join(', ')}`).send(res);
            return;
        }

        next();
    };
};

/**
 * Check if user is admin
 */
export const isAdmin = authorize('admin');

/**
 * Check if user is HR or admin
 */
export const isHROrAdmin = authorize('hr', 'admin');

/**
 * Check if user is manager, HR, or admin
 */
export const isManagerOrAbove = authorize('manager', 'hr', 'admin');

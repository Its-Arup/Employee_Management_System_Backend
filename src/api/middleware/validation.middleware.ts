import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Helper to handle validation errors
const validate = (schema: z.ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            schema.parse(req.body);
            next();
        } catch (err) {
            if (err instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: err.issues.map(issue => ({
                        field: issue.path.join('.'),
                        message: issue.message
                    }))
                });
                return;
            }
            next(err);
        }
    };
};

// Auth validation schemas
export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
});

// User validation schemas
export const registerSchema = z.object({
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must not exceed 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    displayName: z.string().min(2, 'Display name must be at least 2 characters'),
    dateOfBirth: z.string().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional()
});

export const updateProfileSchema = z.object({
    displayName: z.string().min(2, 'Display name must be at least 2 characters').optional(),
    dateOfBirth: z.string().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    designation: z.string().optional(),
    department: z.string().optional(),
    profilePictureUrl: z.string().url('Invalid URL').optional()
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
});

export const approveUserSchema = z.object({
    roles: z.array(z.enum(['employee', 'admin', 'hr', 'manager'])).min(1, 'At least one role is required'),
    employeeId: z.string().optional(),
    designation: z.string().optional(),
    department: z.string().optional(),
    joiningDate: z.string().optional()
});

export const rejectUserSchema = z.object({
    reason: z.string().min(10, 'Reason must be at least 10 characters')
});

export const updateUserRolesSchema = z.object({
    roles: z.array(z.enum(['employee', 'admin', 'hr', 'manager'])).min(1, 'At least one role is required')
});

export const toggleUserStatusSchema = z.object({
    status: z.enum(['active', 'suspended'])
});

export const verifyEmailSchema = z.object({
    otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must contain only numbers')
});

export const resendVerificationEmailSchema = z.object({
    email: z.string().email('Invalid email address')
});

// Export validation middleware
export const validateLogin = validate(loginSchema);
export const validateRefreshToken = validate(refreshTokenSchema);
export const validateRegister = validate(registerSchema);
export const validateUpdateProfile = validate(updateProfileSchema);
export const validateChangePassword = validate(changePasswordSchema);
export const validateApproveUser = validate(approveUserSchema);
export const validateRejectUser = validate(rejectUserSchema);
export const validateUpdateUserRoles = validate(updateUserRolesSchema);
export const validateToggleUserStatus = validate(toggleUserStatusSchema);
export const validateVerifyEmail = validate(verifyEmailSchema);
export const validateResendVerificationEmail = validate(resendVerificationEmailSchema);

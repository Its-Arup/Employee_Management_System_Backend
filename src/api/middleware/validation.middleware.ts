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

// Leave validation schemas
export const applyLeaveSchema = z.object({
    leaveType: z.enum(['casual', 'sick', 'paid', 'unpaid', 'maternity', 'paternity']),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason must not exceed 500 characters'),
    isHalfDay: z.boolean().optional(),
    halfDayPeriod: z.enum(['first-half', 'second-half']).optional(),
    attachments: z.array(z.string()).optional()
});

export const approveLeaveSchema = z.object({
    remarks: z.string().optional()
});

export const rejectLeaveSchema = z.object({
    remarks: z.string().min(10, 'Remarks must be at least 10 characters')
});

// Salary validation schemas
export const createSalarySchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    month: z.number().min(1).max(12),
    year: z.number().min(2020),
    structure: z.object({
        basic: z.number().min(0),
        hra: z.number().min(0),
        medicalAllowance: z.number().min(0).optional(),
        transportAllowance: z.number().min(0).optional(),
        otherAllowances: z.number().min(0).optional(),
        bonus: z.number().min(0).optional(),
        providentFund: z.number().min(0).optional(),
        professionalTax: z.number().min(0).optional(),
        incomeTax: z.number().min(0).optional(),
        otherDeductions: z.number().min(0).optional()
    }),
    workingDays: z.number().min(0).max(31),
    presentDays: z.number().min(0).max(31),
    leaveDays: z.number().min(0).max(31),
    absentDays: z.number().min(0).max(31),
    isProrated: z.boolean().optional(),
    creditDate: z.string().optional(),
    remarks: z.string().optional()
});

export const updateSalaryStatusSchema = z.object({
    status: z.enum(['pending', 'processed', 'paid', 'on-hold'])
});

export const processSalaryPaymentSchema = z.object({
    paymentMethod: z.enum(['bank-transfer', 'cheque', 'cash']),
    transactionId: z.string().optional(),
    actualCreditDate: z.string().optional(),
    remarks: z.string().optional()
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

// Leave validations
export const validateApplyLeave = validate(applyLeaveSchema);
export const validateApproveLeave = validate(approveLeaveSchema);
export const validateRejectLeave = validate(rejectLeaveSchema);

// Salary validations
export const validateCreateSalary = validate(createSalarySchema);
export const validateUpdateSalaryStatus = validate(updateSalaryStatusSchema);
export const validateProcessSalaryPayment = validate(processSalaryPaymentSchema);

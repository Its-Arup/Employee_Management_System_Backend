import { userModel, type User, type UserDocument, createAuditLog } from '../model';
import bcrypt from 'bcrypt';
import { Schema } from 'mongoose';
import { emailService } from './email.service';
import { logger } from '../util';

// Helper to convert to ObjectId
const toObjectId = (id: string | Schema.Types.ObjectId): Schema.Types.ObjectId => {
    if (typeof id === 'string') {
        return new Schema.Types.ObjectId(id);
    }
    return id;
};

export class UserService {
    /**
     * Create a new user (Registration - status will be pending)
     */
    async createUser(userData: {
        username: string;
        email: string;
        password: string;
        displayName: string;
        dateOfBirth?: Date;
        phoneNumber?: string;
        address?: string;
    }): Promise<UserDocument> {
        // Check if user already exists
        const existingUser = await userModel.findOne({
            $or: [{ email: userData.email }, { username: userData.username }]
        });

        if (existingUser) {
            throw new Error('User with this email or username already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(userData.password, 12);

        // Generate 6-digit OTP
        const emailVerificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
        const emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Create user with pending status
        const user = await userModel.create({
            ...userData,
            passwordHash,
            status: 'pending',
            roles: ['employee'],
            isEmailVerified: false,
            emailVerificationOTP,
            emailVerificationExpires
        });

        // Send verification email
        try {
            await emailService.sendVerificationEmail(user.email, user.displayName, emailVerificationOTP);
        } catch (error) {
            logger.error('Failed to send verification email', { meta: error });
            // Don't throw error, user can request resend
        }

        // Create audit log
        await createAuditLog({
            userId: toObjectId(String(user._id)),
            performedBy: toObjectId(String(user._id)),
            action: 'USER_REGISTRATION',
            module: 'user',
            entityType: 'User',
            entityId: toObjectId(String(user._id)),
            status: 'success',
            newData: {
                username: user.username,
                email: user.email,
                displayName: user.displayName
            }
        });

        return user;
    }

    /**
     * Approve a pending user
     */
    async approveUser(
        userId: string,
        adminId: string,
        assignedRoles: ('employee' | 'admin' | 'hr' | 'manager')[],
        employeeId?: string,
        designation?: string,
        department?: string,
        joiningDate?: Date
    ): Promise<UserDocument> {
        const user = await userModel.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        if (user.status !== 'pending') {
            throw new Error('User is not in pending status');
        }

        const previousData = user.toObject();

        // Update user
        user.status = 'active';
        user.roles = assignedRoles;
        user.approvedBy = toObjectId(adminId);
        user.approvedAt = new Date();

        if (employeeId) user.employeeId = employeeId;
        if (designation) user.designation = designation;
        if (department) user.department = department;
        if (joiningDate) user.joiningDate = joiningDate;

        await user.save();

        // Create audit log
        await createAuditLog({
            userId: toObjectId(String(user._id)),
            performedBy: toObjectId(adminId),
            action: 'USER_APPROVED',
            module: 'user',
            entityType: 'User',
            entityId: toObjectId(String(user._id)),
            status: 'success',
            previousData: { status: previousData.status },
            newData: {
                status: user.status,
                roles: user.roles,
                employeeId: user.employeeId,
                designation: user.designation,
                department: user.department
            }
        });

        return user;
    }

    /**
     * Reject a pending user
     */
    async rejectUser(userId: string, adminId: string, reason: string): Promise<UserDocument> {
        const user = await userModel.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        if (user.status !== 'pending') {
            throw new Error('User is not in pending status');
        }

        const previousData = user.toObject();

        user.status = 'rejected';
        user.rejectionReason = reason;
        user.approvedBy = toObjectId(adminId);
        user.approvedAt = new Date();

        await user.save();

        // Create audit log
        await createAuditLog({
            userId: toObjectId(String(user._id)),
            performedBy: toObjectId(adminId),
            action: 'USER_REJECTED',
            module: 'user',
            entityType: 'User',
            entityId: toObjectId(String(user._id)),
            status: 'success',
            previousData: { status: previousData.status },
            newData: { status: user.status, rejectionReason: reason }
        });

        return user;
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<UserDocument | null> {
        return await userModel.findById(userId).select('-passwordHash').populate('approvedBy', 'displayName email');
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email: string): Promise<UserDocument | null> {
        return await userModel.findOne({ email });
    }

    /**
     * Get all users with filters
     */
    async getAllUsers(filters: {
        status?: string;
        role?: string;
        department?: string;
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{ users: UserDocument[]; total: number; page: number; totalPages: number }> {
        const { status, role, department, page = 1, limit = 10, search } = filters;

        const query: Record<string, unknown> = {};

        if (status) query.status = status;
        if (role) query.roles = role;
        if (department) query.department = department;
        if (search) {
            query.$or = [
                { displayName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { employeeId: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            userModel
                .find(query)
                .select('-passwordHash')
                .populate('approvedBy', 'displayName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            userModel.countDocuments(query)
        ]);

        return {
            users: users as UserDocument[],
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    /**
     * Get pending user requests
     */
    async getPendingUsers(): Promise<UserDocument[]> {
        return await userModel.find({ status: 'pending' }).select('-passwordHash').sort({ createdAt: 1 });
    }

    /**
     * Update user profile
     */
    async updateUser(userId: string, updateData: Partial<User>, updatedBy: string): Promise<UserDocument | null> {
        const user = await userModel.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        const previousData = user.toObject();

        // Fields that cannot be updated via this method
        delete updateData.passwordHash;
        delete updateData.status;
        delete updateData.approvedBy;
        delete updateData.approvedAt;
        delete updateData.roles;

        Object.assign(user, updateData);
        await user.save();

        // Create audit log
        await createAuditLog({
            userId: toObjectId(String(user._id)),
            performedBy: toObjectId(updatedBy),
            action: 'USER_UPDATED',
            module: 'user',
            entityType: 'User',
            entityId: toObjectId(String(user._id)),
            status: 'success',
            previousData: JSON.parse(JSON.stringify(previousData)) as Record<string, unknown>,
            newData: updateData as Record<string, unknown>
        });

        return user;
    }

    /**
     * Update user password
     */
    async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        const user = await userModel.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            throw new Error('Current password is incorrect');
        }

        // Hash new password
        user.passwordHash = await bcrypt.hash(newPassword, 12);
        await user.save();

        // Create audit log
        await createAuditLog({
            userId: toObjectId(String(user._id)),
            performedBy: toObjectId(String(user._id)),
            action: 'PASSWORD_CHANGED',
            module: 'auth',
            entityType: 'User',
            entityId: toObjectId(String(user._id)),
            status: 'success'
        });
    }

    /**
     * Suspend/Activate user
     */
    async toggleUserStatus(userId: string, adminId: string, status: 'active' | 'suspended'): Promise<UserDocument> {
        const user = await userModel.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        const previousStatus = user.status;
        user.status = status;
        await user.save();

        // Create audit log
        await createAuditLog({
            userId: toObjectId(String(user._id)),
            performedBy: toObjectId(adminId),
            action: status === 'suspended' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
            module: 'user',
            entityType: 'User',
            entityId: toObjectId(String(user._id)),
            status: 'success',
            previousData: { status: previousStatus },
            newData: { status }
        });

        return user;
    }

    /**
     * Delete user (soft delete - mark as inactive)
     */
    async deleteUser(userId: string, adminId: string): Promise<void> {
        const user = await userModel.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        await userModel.findByIdAndDelete(userId);

        // Create audit log
        await createAuditLog({
            userId: toObjectId(String(user._id)),
            performedBy: toObjectId(adminId),
            action: 'USER_DELETED',
            module: 'user',
            entityType: 'User',
            entityId: toObjectId(String(user._id)),
            status: 'success',
            previousData: JSON.parse(JSON.stringify(user.toObject())) as Record<string, unknown>
        });
    }

    /**
     * Update user roles
     */
    async updateUserRoles(userId: string, roles: ('employee' | 'admin' | 'hr' | 'manager')[], adminId: string): Promise<UserDocument> {
        const user = await userModel.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        const previousRoles = user.roles;
        user.roles = roles;
        await user.save();

        // Create audit log
        await createAuditLog({
            userId: toObjectId(String(user._id)),
            performedBy: toObjectId(adminId),
            action: 'USER_ROLES_UPDATED',
            module: 'user',
            entityType: 'User',
            entityId: toObjectId(String(user._id)),
            status: 'success',
            previousData: { roles: previousRoles },
            newData: { roles }
        });

        return user;
    }

    /**
     * Verify password
     */
    async verifyPassword(email: string, password: string): Promise<UserDocument | null> {
        const user = await userModel.findOne({ email });

        if (!user) {
            return null;
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        return isMatch ? user : null;
    }

    /**
     * Verify email with OTP
     */
    async verifyEmail(otp: string): Promise<UserDocument> {
        const user = await userModel.findOne({
            emailVerificationOTP: otp,
            emailVerificationExpires: { $gt: new Date() }
        });

        if (!user) {
            throw new Error('Invalid or expired OTP');
        }

        user.isEmailVerified = true;
        user.emailVerificationOTP = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        // Send welcome email
        try {
            await emailService.sendWelcomeEmail(user.email, user.displayName);
        } catch (error) {
            logger.error('Failed to send welcome email', { meta: error });
        }

        // Create audit log
        await createAuditLog({
            userId: toObjectId(String(user._id)),
            performedBy: toObjectId(String(user._id)),
            action: 'EMAIL_VERIFIED',
            module: 'auth',
            entityType: 'User',
            entityId: toObjectId(String(user._id)),
            status: 'success'
        });

        return user;
    }

    /**
     * Resend verification email
     */
    async resendVerificationEmail(email: string): Promise<void> {
        const user = await userModel.findOne({ email });

        if (!user) {
            throw new Error('User not found');
        }

        if (user.isEmailVerified) {
            throw new Error('Email is already verified');
        }

        // Generate new 6-digit OTP
        const emailVerificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
        const emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        user.emailVerificationOTP = emailVerificationOTP;
        user.emailVerificationExpires = emailVerificationExpires;
        await user.save();

        // Resend verification email
        await emailService.resendVerificationEmail(user.email, user.displayName, emailVerificationOTP);

        // Create audit log
        await createAuditLog({
            userId: toObjectId(String(user._id)),
            performedBy: toObjectId(String(user._id)),
            action: 'VERIFICATION_EMAIL_RESENT',
            module: 'auth',
            entityType: 'User',
            entityId: toObjectId(String(user._id)),
            status: 'success'
        });
    }
}

export const userService = new UserService();

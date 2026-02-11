import { Types } from 'mongoose';
import { leaveModel } from '../model/leave.model';
import { leaveBalanceModel } from '../model/leaveBalance.model';
import { userModel } from '../model/user.model';
import { BadRequestError, NotFoundError, ForbiddenError } from '../util/apiError';
import { auditLogModel } from '../model/auditLog.model';

export class LeaveService {
    /**
     * Apply for leave
     */
    public async applyLeave(
        userId: string,
        leaveType: 'casual' | 'sick' | 'paid' | 'unpaid' | 'maternity' | 'paternity',
        startDate: Date,
        endDate: Date,
        reason: string,
        isHalfDay: boolean = false,
        halfDayPeriod?: 'first-half' | 'second-half',
        attachments?: string[]
    ) {
        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (start < today) {
            throw new BadRequestError('Cannot apply for leave in the past');
        }

        if (end < start) {
            throw new BadRequestError('End date must be after or equal to start date');
        }

        // Calculate total days
        let totalDays = 0;
        if (isHalfDay) {
            totalDays = 0.5;
            if (!halfDayPeriod) {
                throw new BadRequestError('Half day period is required for half day leave');
            }
        } else {
            const diffTime = Math.abs(end.getTime() - start.getTime());
            totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }

        // Check for overlapping leaves
        const overlappingLeave = await leaveModel.findOne({
            userId: new Types.ObjectId(userId),
            status: { $in: ['pending', 'approved'] },
            $or: [
                { startDate: { $lte: end }, endDate: { $gte: start } }
            ]
        });

        if (overlappingLeave) {
            throw new BadRequestError('You already have a leave request for this date range');
        }

        // Check leave balance (except for unpaid leave)
        if (leaveType !== 'unpaid') {
            const currentYear = new Date().getFullYear();
            let leaveBalance = await leaveBalanceModel.findOne({
                userId: new Types.ObjectId(userId),
                year: currentYear
            });

            // Create leave balance if doesn't exist
            if (!leaveBalance) {
                leaveBalance = await leaveBalanceModel.create({
                    userId: new Types.ObjectId(userId),
                    year: currentYear
                });
            }

            const balanceKey = leaveType as 'casual' | 'sick' | 'paid';
            if (leaveBalance[balanceKey].remaining < totalDays) {
                throw new BadRequestError(
                    `Insufficient ${leaveType} leave balance. Available: ${leaveBalance[balanceKey].remaining} days`
                );
            }
        }

        // Create leave request
        const leave = await leaveModel.create({
            userId: new Types.ObjectId(userId),
            leaveType,
            startDate: start,
            endDate: end,
            totalDays,
            reason,
            isHalfDay,
            halfDayPeriod: isHalfDay ? halfDayPeriod : undefined,
            attachments: attachments || [],
            status: 'pending'
        });

        // Create audit log
        await auditLogModel.create({
            userId: new Types.ObjectId(userId),
            performedBy: new Types.ObjectId(userId),
            action: 'LEAVE_APPLIED',
            module: 'leave',
            entityType: 'Leave',
            entityId: leave._id,
            status: 'success',
            metadata: {
                leaveType,
                startDate: start,
                endDate: end,
                totalDays
            }
        });

        return leave;
    }

    /**
     * Get my leaves
     */
    public async getMyLeaves(
        userId: string,
        status?: string,
        startDate?: Date,
        endDate?: Date,
        page: number = 1,
        limit: number = 10
    ) {
        const query: any = { userId: new Types.ObjectId(userId) };

        if (status) {
            query.status = status;
        }

        if (startDate || endDate) {
            query.startDate = {};
            if (startDate) query.startDate.$gte = new Date(startDate);
            if (endDate) query.startDate.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;

        const [leaves, total] = await Promise.all([
            leaveModel
                .find(query)
                .populate('reviewedBy', 'displayName email employeeId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            leaveModel.countDocuments(query)
        ]);

        return {
            leaves,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get leave balance
     */
    public async getLeaveBalance(userId: string, year?: number) {
        const targetYear = year || new Date().getFullYear();

        let leaveBalance = await leaveBalanceModel.findOne({
            userId: new Types.ObjectId(userId),
            year: targetYear
        });

        if (!leaveBalance) {
            // Create default leave balance
            leaveBalance = await leaveBalanceModel.create({
                userId: new Types.ObjectId(userId),
                year: targetYear
            });
        }

        return leaveBalance;
    }

    /**
     * Get all leave requests (Admin/Manager)
     */
    public async getAllLeaves(
        status?: string,
        leaveType?: string,
        startDate?: Date,
        endDate?: Date,
        userId?: string,
        page: number = 1,
        limit: number = 10
    ) {
        const query: any = {};

        if (status) query.status = status;
        if (leaveType) query.leaveType = leaveType;
        if (userId) query.userId = new Types.ObjectId(userId);

        if (startDate || endDate) {
            query.startDate = {};
            if (startDate) query.startDate.$gte = new Date(startDate);
            if (endDate) query.startDate.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;

        const [leaves, total] = await Promise.all([
            leaveModel
                .find(query)
                .populate('userId', 'displayName email employeeId department designation')
                .populate('reviewedBy', 'displayName email employeeId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            leaveModel.countDocuments(query)
        ]);

        return {
            leaves,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get pending leave requests
     */
    public async getPendingLeaves(page: number = 1, limit: number = 10) {
        return this.getAllLeaves('pending', undefined, undefined, undefined, undefined, page, limit);
    }

    /**
     * Approve leave
     */
    public async approveLeave(leaveId: string, reviewerId: string, remarks?: string) {
        const leave = await leaveModel.findById(leaveId);

        if (!leave) {
            throw new NotFoundError('Leave request not found');
        }

        if (leave.status !== 'pending') {
            throw new BadRequestError(`Leave is already ${leave.status}`);
        }

        // Update leave status
        leave.status = 'approved';
        leave.reviewedBy = new Types.ObjectId(reviewerId) as any;
        leave.reviewedAt = new Date();
        if (remarks) leave.reviewRemarks = remarks;
        await leave.save();

        // Update leave balance
        if (leave.leaveType !== 'unpaid') {
            const year = leave.startDate.getFullYear();
            const leaveBalance = await leaveBalanceModel.findOne({
                userId: leave.userId,
                year
            });

            if (leaveBalance) {
                const balanceKey = leave.leaveType as 'casual' | 'sick' | 'paid';
                leaveBalance[balanceKey].used += leave.totalDays;
                await leaveBalance.save();
            }
        }

        // Create audit log
        await auditLogModel.create({
            userId: leave.userId,
            performedBy: new Types.ObjectId(reviewerId),
            action: 'LEAVE_APPROVED',
            module: 'leave',
            entityType: 'Leave',
            entityId: leave._id,
            status: 'success',
            metadata: {
                leaveId: leave._id,
                employeeId: leave.userId,
                remarks
            }
        });

        return leave;
    }

    /**
     * Reject leave
     */
    public async rejectLeave(leaveId: string, reviewerId: string, remarks: string) {
        const leave = await leaveModel.findById(leaveId);

        if (!leave) {
            throw new NotFoundError('Leave request not found');
        }

        if (leave.status !== 'pending') {
            throw new BadRequestError(`Leave is already ${leave.status}`);
        }

        // Update leave status
        leave.status = 'rejected';
        leave.reviewedBy = new Types.ObjectId(reviewerId) as any;
        leave.reviewedAt = new Date();
        leave.reviewRemarks = remarks;
        await leave.save();

        // Create audit log
        await auditLogModel.create({
            userId: leave.userId,
            performedBy: new Types.ObjectId(reviewerId),
            action: 'LEAVE_REJECTED',
            module: 'leave',
            entityType: 'Leave',
            entityId: leave._id,
            status: 'success',
            metadata: {
                leaveId: leave._id,
                employeeId: leave.userId,
                remarks
            }
        });

        return leave;
    }

    /**
     * Cancel leave (by employee)
     */
    public async cancelLeave(leaveId: string, userId: string) {
        const leave = await leaveModel.findById(leaveId);

        if (!leave) {
            throw new NotFoundError('Leave request not found');
        }

        if (leave.userId.toString() !== userId) {
            throw new ForbiddenError('Unauthorized to cancel this leave');
        }

        if (leave.status === 'cancelled') {
            throw new BadRequestError('Leave is already cancelled');
        }

        if (leave.status === 'rejected') {
            throw new BadRequestError('Cannot cancel rejected leave');
        }

        // If approved, refund leave balance
        if (leave.status === 'approved' && leave.leaveType !== 'unpaid') {
            const year = leave.startDate.getFullYear();
            const leaveBalance = await leaveBalanceModel.findOne({
                userId: leave.userId,
                year
            });

            if (leaveBalance) {
                const balanceKey = leave.leaveType as 'casual' | 'sick' | 'paid';
                leaveBalance[balanceKey].used -= leave.totalDays;
                await leaveBalance.save();
            }
        }

        leave.status = 'cancelled';
        await leave.save();

        // Create audit log
        await auditLogModel.create({
            userId: new Types.ObjectId(userId),
            performedBy: new Types.ObjectId(userId),
            action: 'LEAVE_CANCELLED',
            module: 'leave',
            entityType: 'Leave',
            entityId: leave._id,
            status: 'success',
            metadata: {
                leaveId: leave._id
            }
        });

        return leave;
    }

    /**
     * Get leave by ID
     */
    public async getLeaveById(leaveId: string) {
        const leave = await leaveModel
            .findById(leaveId)
            .populate('userId', 'displayName email employeeId department designation')
            .populate('reviewedBy', 'displayName email employeeId')
            .lean();

        if (!leave) {
            throw new NotFoundError('Leave request not found');
        }

        return leave;
    }

    /**
     * Get leave statistics
     */
    public async getLeaveStatistics(userId?: string, year?: number) {
        const targetYear = year || new Date().getFullYear();
        const query: any = {
            startDate: {
                $gte: new Date(targetYear, 0, 1),
                $lte: new Date(targetYear, 11, 31)
            }
        };

        if (userId) {
            query.userId = new Types.ObjectId(userId);
        }

        const statistics = await leaveModel.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalDays: { $sum: '$totalDays' }
                }
            }
        ]);

        const result: any = {
            pending: { count: 0, totalDays: 0 },
            approved: { count: 0, totalDays: 0 },
            rejected: { count: 0, totalDays: 0 },
            cancelled: { count: 0, totalDays: 0 }
        };

        statistics.forEach(stat => {
            result[stat._id] = {
                count: stat.count,
                totalDays: stat.totalDays
            };
        });

        return result;
    }
}

export const leaveService = new LeaveService();

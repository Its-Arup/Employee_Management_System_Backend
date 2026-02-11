import { Types } from 'mongoose';
import { salaryModel, SalaryStructure } from '../model/salary.model';
import { userModel } from '../model/user.model';
import { BadRequestError, NotFoundError } from '../util/apiError';
import { auditLogModel } from '../model/auditLog.model';
import { emailService } from './email.service';

export class SalaryService {
    /**
     * Create salary record (Admin/HR)
     */
    public async createSalary(
        userId: string,
        month: number,
        year: number,
        structure: SalaryStructure,
        grossSalary: number,
        totalDeductions: number,
        netSalary: number,
        workingDays: number,
        presentDays: number,
        leaveDays: number,
        absentDays: number,
        isProrated: boolean,
        createdById: string,
        creditDate?: Date,
        remarks?: string
    ) {
        // Verify user exists
        const user = await userModel.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Check if salary already exists for this month
        const existingSalary = await salaryModel.findOne({
            userId: new Types.ObjectId(userId),
            month,
            year
        });

        if (existingSalary) {
            throw new BadRequestError(`Salary for ${month}/${year} already exists`);
        }

        // Validate days
        if (presentDays + absentDays > workingDays) {
            throw new BadRequestError('Present days + absent days cannot exceed working days');
        }

        // Create salary record
        const salary = await salaryModel.create({
            userId: new Types.ObjectId(userId),
            month,
            year,
            structure,
            grossSalary,
            totalDeductions,
            netSalary,
            workingDays,
            presentDays,
            leaveDays,
            absentDays,
            isProrated,
            creditDate: creditDate || undefined,
            remarks: remarks || undefined,
            createdBy: new Types.ObjectId(createdById),
            status: 'pending'
        });

        // Create audit log
        await auditLogModel.create({
            userId: new Types.ObjectId(userId),
            performedBy: new Types.ObjectId(createdById),
            action: 'SALARY_CREATED',
            module: 'salary',
            entityType: 'Salary',
            entityId: salary._id,
            status: 'success',
            metadata: {
                employeeId: userId,
                month,
                year,
                netSalary: salary.netSalary
            }
        });

        return salary;
    }

    /**
     * Get my salary records (Employee)
     */
    public async getMySalaries(
        userId: string,
        year?: number,
        month?: number,
        page: number = 1,
        limit: number = 10
    ) {
        const query: any = { userId: new Types.ObjectId(userId) };

        if (year) query.year = year;
        if (month) query.month = month;

        const skip = (page - 1) * limit;

        const [salaries, total] = await Promise.all([
            salaryModel
                .find(query)
                .populate('createdBy', 'displayName email')
                .populate('processedBy', 'displayName email')
                .sort({ year: -1, month: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            salaryModel.countDocuments(query)
        ]);

        return {
            salaries,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get salary by ID
     */
    public async getSalaryById(salaryId: string, requesterId?: string) {
        const salary = await salaryModel
            .findById(salaryId)
            .populate('userId', 'displayName email employeeId department designation')
            .populate('createdBy', 'displayName email')
            .populate('processedBy', 'displayName email')
            .lean();

        if (!salary) {
            throw new NotFoundError('Salary record not found');
        }

        // If requester is not admin/hr, verify they can only see their own salary
        if (requesterId && (salary.userId as any)._id && (salary.userId as any)._id.toString() !== requesterId) {
            // This will be checked by the controller based on user roles
        }

        return salary;
    }

    /**
     * Get all salaries (Admin/HR)
     */
    public async getAllSalaries(
        userId?: string,
        year?: number,
        month?: number,
        status?: string,
        department?: string,
        page: number = 1,
        limit: number = 10
    ) {
        const query: any = {};

        if (userId) query.userId = new Types.ObjectId(userId);
        if (year) query.year = year;
        if (month) query.month = month;
        if (status) query.status = status;

        const skip = (page - 1) * limit;

        // If department filter is provided, first get users from that department
        let userIds: Types.ObjectId[] | undefined;
        if (department) {
            const users = await userModel.find({ department }).select('_id');
            userIds = users.map(u => u._id as Types.ObjectId);
            query.userId = { $in: userIds };
        }

        const [salaries, total] = await Promise.all([
            salaryModel
                .find(query)
                .populate('userId', 'displayName email employeeId department designation')
                .populate('createdBy', 'displayName email')
                .populate('processedBy', 'displayName email')
                .sort({ year: -1, month: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            salaryModel.countDocuments(query)
        ]);

        return {
            salaries,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Update salary status (Admin/HR)
     */
    public async updateSalaryStatus(
        salaryId: string,
        status: 'pending' | 'processed' | 'paid' | 'on-hold',
        updatedById: string
    ) {
        const salary = await salaryModel.findById(salaryId).populate('userId', 'email displayName');

        if (!salary) {
            throw new NotFoundError('Salary record not found');
        }

        const previousStatus = salary.status;
        salary.status = status;

        if (status === 'processed') {
            salary.processedBy = new Types.ObjectId(updatedById) as any;
            salary.processedAt = new Date();
        }

        await salary.save();

        // Create audit log
        await auditLogModel.create({
            userId: salary.userId,
            performedBy: new Types.ObjectId(updatedById),
            action: 'SALARY_STATUS_UPDATED',
            module: 'salary',
            entityType: 'Salary',
            entityId: salary._id,
            status: 'success',
            metadata: {
                employeeId: salary.userId,
                status
            }
        });

        // Send email notification when status changes to paid
        if (status === 'paid' && previousStatus !== 'paid') {
            const user = salary.userId as any;
            if (user && user.email && user.displayName) {
                await emailService.sendSalaryPaidEmail(
                    user.email,
                    user.displayName,
                    {
                        month: salary.month,
                        year: salary.year,
                        netSalary: salary.netSalary,
                        grossSalary: salary.grossSalary,
                        totalDeductions: salary.totalDeductions,
                        creditDate: salary.creditDate
                    }
                );
            }
        }

        return salary;
    }

    /**
     * Process salary payment (Admin/HR)
     */
    public async processSalaryPayment(
        salaryId: string,
        paymentMethod: 'bank-transfer' | 'cheque' | 'cash',
        processedById: string,
        transactionId?: string,
        actualCreditDate?: Date,
        remarks?: string
    ) {
        const salary = await salaryModel.findById(salaryId).populate('userId', 'email displayName');

        if (!salary) {
            throw new NotFoundError('Salary record not found');
        }

        if (salary.status === 'paid') {
            throw new BadRequestError('Salary already paid');
        }

        salary.status = 'paid';
        salary.paymentMethod = paymentMethod;
        salary.transactionId = transactionId;
        salary.actualCreditDate = actualCreditDate || new Date();
        salary.processedBy = new Types.ObjectId(processedById) as any;
        salary.processedAt = new Date();
        if (remarks) salary.remarks = remarks;

        await salary.save();

        // Create audit log
        await auditLogModel.create({
            userId: salary.userId,
            performedBy: new Types.ObjectId(processedById),
            action: 'SALARY_PAID',
            module: 'salary',
            entityType: 'Salary',
            entityId: salary._id,
            status: 'success',
            metadata: {
                employeeId: salary.userId,
                paymentMethod,
                transactionId,
                amount: salary.netSalary
            }
        });

        // Send email notification
        const user = salary.userId as any;
        if (user && user.email && user.displayName) {
            await emailService.sendSalaryPaidEmail(
                user.email,
                user.displayName,
                {
                    month: salary.month,
                    year: salary.year,
                    netSalary: salary.netSalary,
                    grossSalary: salary.grossSalary,
                    totalDeductions: salary.totalDeductions,
                    creditDate: salary.actualCreditDate || salary.creditDate
                }
            );
        }

        return salary;
    }

    /**
     * Update salary record (Admin/HR)
     */
    public async updateSalary(
        salaryId: string,
        updateData: Partial<{
            structure: SalaryStructure;
            workingDays: number;
            presentDays: number;
            leaveDays: number;
            absentDays: number;
            isProrated: boolean;
            creditDate: Date;
            remarks: string;
        }>,
        updatedById: string
    ) {
        const salary = await salaryModel.findById(salaryId);

        if (!salary) {
            throw new NotFoundError('Salary record not found');
        }

        if (salary.status === 'paid') {
            throw new BadRequestError('Cannot update paid salary. Please contact system administrator.');
        }

        // Update fields
        if (updateData.structure) salary.structure = { ...salary.structure, ...updateData.structure };
        if (updateData.workingDays !== undefined) salary.workingDays = updateData.workingDays;
        if (updateData.presentDays !== undefined) salary.presentDays = updateData.presentDays;
        if (updateData.leaveDays !== undefined) salary.leaveDays = updateData.leaveDays;
        if (updateData.absentDays !== undefined) salary.absentDays = updateData.absentDays;
        if (updateData.isProrated !== undefined) salary.isProrated = updateData.isProrated;
        if (updateData.creditDate) salary.creditDate = updateData.creditDate;
        if (updateData.remarks) salary.remarks = updateData.remarks;

        // Validate days
        if (salary.presentDays + salary.absentDays > salary.workingDays) {
            throw new BadRequestError('Present days + absent days cannot exceed working days');
        }

        await salary.save();

        // Create audit log
        await auditLogModel.create({
            userId: salary.userId,
            performedBy: new Types.ObjectId(updatedById),
            action: 'SALARY_UPDATED',
            module: 'salary',
            entityType: 'Salary',
            entityId: salary._id,
            status: 'success',
            metadata: {
                employeeId: salary.userId,
                updates: Object.keys(updateData)
            }
        });

        return salary;
    }

    /**
     * Delete salary record (Admin only)
     */
    public async deleteSalary(salaryId: string, deletedById: string) {
        const salary = await salaryModel.findById(salaryId);

        if (!salary) {
            throw new NotFoundError('Salary record not found');
        }

        if (salary.status === 'paid') {
            throw new BadRequestError('Cannot delete paid salary. Please contact system administrator.');
        }

        await salary.deleteOne();

        // Create audit log
        await auditLogModel.create({
            userId: salary.userId,
            performedBy: new Types.ObjectId(deletedById),
            action: 'SALARY_DELETED',
            module: 'salary',
            entityType: 'Salary',
            entityId: salary._id,
            status: 'success',
            metadata: {
                employeeId: salary.userId,
                month: salary.month,
                year: salary.year
            }
        });

        return { message: 'Salary record deleted successfully' };
    }

    /**
     * Get salary statistics
     */
    public async getSalaryStatistics(year?: number, department?: string) {
        const targetYear = year || new Date().getFullYear();
        const query: any = { year: targetYear };

        // If department filter is provided, first get users from that department
        if (department) {
            const users = await userModel.find({ department }).select('_id');
            const userIds = users.map(u => u._id);
            query.userId = { $in: userIds };
        }

        const statistics = await salaryModel.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$netSalary' }
                }
            }
        ]);

        const monthlyStats = await salaryModel.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$month',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$netSalary' },
                    avgSalary: { $avg: '$netSalary' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const result: any = {
            byStatus: {
                pending: { count: 0, totalAmount: 0 },
                processed: { count: 0, totalAmount: 0 },
                paid: { count: 0, totalAmount: 0 },
                'on-hold': { count: 0, totalAmount: 0 }
            },
            byMonth: []
        };

        statistics.forEach(stat => {
            result.byStatus[stat._id] = {
                count: stat.count,
                totalAmount: Math.round(stat.totalAmount * 100) / 100
            };
        });

        result.byMonth = monthlyStats.map(stat => ({
            month: stat._id,
            count: stat.count,
            totalAmount: Math.round(stat.totalAmount * 100) / 100,
            avgSalary: Math.round(stat.avgSalary * 100) / 100
        }));

        return result;
    }

    /**
     * Generate bulk salaries for a month (Admin/HR)
     */
    public async generateBulkSalaries(
        month: number,
        year: number,
        createdById: string,
        department?: string
    ) {
        // Build query for active employees
        const query: any = { status: 'active', roles: 'employee' };
        if (department) query.department = department;

        const employees = await userModel.find(query);

        if (employees.length === 0) {
            throw new NotFoundError('No active employees found');
        }

        const results = {
            success: [] as string[],
            failed: [] as { userId: string; reason: string }[]
        };

        for (const employee of employees) {
            try {
                // Check if salary already exists
                const existing = await salaryModel.findOne({
                    userId: employee._id,
                    month,
                    year
                });

                if (existing) {
                    results.failed.push({
                        userId: String(employee._id),
                        reason: 'Salary already exists'
                    });
                    continue;
                }

                // Create default salary structure (should be customized based on employee)
                const defaultStructure: SalaryStructure = {
                    basic: 30000,
                    hra: 12000,
                    medicalAllowance: 2000,
                    transportAllowance: 1500,
                    otherAllowances: 1000,
                    bonus: 0,
                    providentFund: 3600,
                    professionalTax: 200,
                    incomeTax: 5000,
                    otherDeductions: 0
                };

                // Calculate gross, deductions, and net
                const grossSalary = (defaultStructure.basic || 0) + 
                    (defaultStructure.hra || 0) + 
                    (defaultStructure.medicalAllowance || 0) + 
                    (defaultStructure.transportAllowance || 0) + 
                    (defaultStructure.otherAllowances || 0) + 
                    (defaultStructure.bonus || 0);
                
                const totalDeductions = (defaultStructure.providentFund || 0) + 
                    (defaultStructure.professionalTax || 0) + 
                    (defaultStructure.incomeTax || 0) + 
                    (defaultStructure.otherDeductions || 0);
                
                const netSalary = grossSalary - totalDeductions;

                await this.createSalary(
                    String(employee._id),
                    month,
                    year,
                    defaultStructure,
                    grossSalary,
                    totalDeductions,
                    netSalary,
                    30, // working days
                    30, // present days (will need actual attendance data)
                    0, // leave days
                    0, // absent days
                    false,
                    createdById
                );

                results.success.push(String(employee._id));
            } catch (error) {
                results.failed.push({
                    userId: String(employee._id),
                    reason: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return results;
    }
}

export const salaryService = new SalaryService();

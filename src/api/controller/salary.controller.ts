import { Request, Response } from 'express';
import { salaryService } from '../../service/salary.service';
import { SuccessResponse } from '../../util';
import { asyncHandler } from '../../util';
import { AuthRequest } from '../middleware/auth.middleware';
import { SalaryStructure } from '../../model/salary.model';

export class SalaryController {
    /**
     * Create salary record (Admin/HR)
     */
    public createSalary = asyncHandler(async (req: Request, res: Response) => {
        const createdById = (req as AuthRequest).user.id;
        const {
            userId,
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
            creditDate,
            remarks
        } = req.body as {
            userId: string;
            month: number;
            year: number;
            structure: SalaryStructure;
            grossSalary: number;
            totalDeductions: number;
            netSalary: number;
            workingDays: number;
            presentDays: number;
            leaveDays: number;
            absentDays: number;
            isProrated?: boolean;
            creditDate?: string;
            remarks?: string;
        };

        const salary = await salaryService.createSalary(
            userId,
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
            isProrated || false,
            createdById,
            creditDate ? new Date(creditDate) : undefined,
            remarks
        );

        new SuccessResponse(salary, 'Salary record created successfully').send(res);
    });

    /**
     * Get my salary records (Employee)
     */
    public getMySalaries = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).user.id;
        const { year, month, page, limit } = req.query;

        const result = await salaryService.getMySalaries(
            userId,
            year ? parseInt(year as string) : undefined,
            month ? parseInt(month as string) : undefined,
            page ? parseInt(page as string) : 1,
            limit ? parseInt(limit as string) : 10
        );

        new SuccessResponse(result, 'Salary records fetched successfully').send(res);
    });

    /**
     * Get salary by ID
     */
    public getSalaryById = asyncHandler(async (req: Request, res: Response) => {
        const { salaryId } = req.params;
        const user = (req as AuthRequest).user;

        const salary = await salaryService.getSalaryById(salaryId, user.id);

        // Check if user has permission to view this salary
        if (!user.roles.includes('admin') && !user.roles.includes('hr')) {
            const salaryUserId = (salary.userId as any)._id ? (salary.userId as any)._id.toString() : String(salary.userId);
            if (salaryUserId !== user.id) {
                throw new Error('Unauthorized to view this salary record');
            }
        }

        new SuccessResponse(salary, 'Salary record fetched successfully').send(res);
    });

    /**
     * Get all salaries (Admin/HR)
     */
    public getAllSalaries = asyncHandler(async (req: Request, res: Response) => {
        const { userId, year, month, status, department, page, limit } = req.query;

        const result = await salaryService.getAllSalaries(
            userId as string,
            year ? parseInt(year as string) : undefined,
            month ? parseInt(month as string) : undefined,
            status as string,
            department as string,
            page ? parseInt(page as string) : 1,
            limit ? parseInt(limit as string) : 10
        );

        new SuccessResponse(result, 'Salary records fetched successfully').send(res);
    });

    /**
     * Update salary status (Admin/HR)
     */
    public updateSalaryStatus = asyncHandler(async (req: Request, res: Response) => {
        const { salaryId } = req.params;
        const updatedById = (req as AuthRequest).user.id;
        const { status } = req.body as { status: 'pending' | 'processed' | 'paid' | 'on-hold' };

        const salary = await salaryService.updateSalaryStatus(salaryId, status, updatedById);

        new SuccessResponse(salary, 'Salary status updated successfully').send(res);
    });

    /**
     * Process salary payment (Admin/HR)
     */
    public processSalaryPayment = asyncHandler(async (req: Request, res: Response) => {
        const { salaryId } = req.params;
        const processedById = (req as AuthRequest).user.id;
        const { paymentMethod, transactionId, actualCreditDate, remarks } = req.body as {
            paymentMethod: 'bank-transfer' | 'cheque' | 'cash';
            transactionId?: string;
            actualCreditDate?: string;
            remarks?: string;
        };

        const salary = await salaryService.processSalaryPayment(
            salaryId,
            paymentMethod,
            processedById,
            transactionId,
            actualCreditDate ? new Date(actualCreditDate) : undefined,
            remarks
        );

        new SuccessResponse(salary, 'Salary payment processed successfully').send(res);
    });

    /**
     * Update salary record (Admin/HR)
     */
    public updateSalary = asyncHandler(async (req: Request, res: Response) => {
        const { salaryId } = req.params;
        const updatedById = (req as AuthRequest).user.id;
        const updateData = req.body;

        // Convert creditDate string to Date if present
        if (updateData.creditDate) {
            updateData.creditDate = new Date(updateData.creditDate);
        }

        const salary = await salaryService.updateSalary(salaryId, updateData, updatedById);

        new SuccessResponse(salary, 'Salary record updated successfully').send(res);
    });

    /**
     * Delete salary record (Admin only)
     */
    public deleteSalary = asyncHandler(async (req: Request, res: Response) => {
        const { salaryId } = req.params;
        const deletedById = (req as AuthRequest).user.id;

        await salaryService.deleteSalary(salaryId, deletedById);

        new SuccessResponse(null, 'Salary record deleted successfully').send(res);
    });

    /**
     * Get salary statistics (Admin/HR)
     */
    public getSalaryStatistics = asyncHandler(async (req: Request, res: Response) => {
        const { year, department } = req.query;

        const statistics = await salaryService.getSalaryStatistics(
            year ? parseInt(year as string) : undefined,
            department as string
        );

        new SuccessResponse(statistics, 'Salary statistics fetched successfully').send(res);
    });

    /**
     * Generate bulk salaries (Admin/HR)
     */
    public generateBulkSalaries = asyncHandler(async (req: Request, res: Response) => {
        const createdById = (req as AuthRequest).user.id;
        const { month, year, department } = req.body as {
            month: number;
            year: number;
            department?: string;
        };

        const result = await salaryService.generateBulkSalaries(month, year, createdById, department);

        new SuccessResponse(
            result,
            `Bulk salary generation completed. Success: ${result.success.length}, Failed: ${result.failed.length}`
        ).send(res);
    });
}

export const salaryController = new SalaryController();

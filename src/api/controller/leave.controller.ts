import { Request, Response } from 'express';
import { leaveService } from '../../service/leave.service';
import { SuccessResponse } from '../../util';
import { asyncHandler } from '../../util';
import { AuthRequest } from '../middleware/auth.middleware';

export class LeaveController {
    /**
     * Apply for leave (Employee)
     */
    public applyLeave = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).user.id;
        const {
            leaveType,
            startDate,
            endDate,
            reason,
            isHalfDay,
            halfDayPeriod,
            attachments
        } = req.body as {
            leaveType: 'casual' | 'sick' | 'paid' | 'unpaid' | 'maternity' | 'paternity';
            startDate: string;
            endDate: string;
            reason: string;
            isHalfDay?: boolean;
            halfDayPeriod?: 'first-half' | 'second-half';
            attachments?: string[];
        };

        const leave = await leaveService.applyLeave(
            userId,
            leaveType,
            new Date(startDate),
            new Date(endDate),
            reason,
            isHalfDay || false,
            halfDayPeriod,
            attachments
        );

        new SuccessResponse(leave, 'Leave application submitted successfully').send(res);
    });

    /**
     * Get my leaves (Employee)
     */
    public getMyLeaves = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).user.id;
        const { status, startDate, endDate, page, limit } = req.query;

        const result = await leaveService.getMyLeaves(
            userId,
            status as string,
            startDate ? new Date(startDate as string) : undefined,
            endDate ? new Date(endDate as string) : undefined,
            page ? parseInt(page as string) : 1,
            limit ? parseInt(limit as string) : 10
        );

        new SuccessResponse(result, 'Leaves fetched successfully').send(res);
    });

    /**
     * Get my leave balance (Employee)
     */
    public getMyLeaveBalance = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).user.id;
        const { year } = req.query;

        const balance = await leaveService.getLeaveBalance(
            userId,
            year ? parseInt(year as string) : undefined
        );

        new SuccessResponse(balance, 'Leave balance fetched successfully').send(res);
    });

    /**
     * Cancel my leave (Employee)
     */
    public cancelLeave = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).user.id;
        const { leaveId } = req.params;

        const leave = await leaveService.cancelLeave(leaveId, userId);

        new SuccessResponse(leave, 'Leave cancelled successfully').send(res);
    });

    /**
     * Get all leaves (Admin/Manager)
     */
    public getAllLeaves = asyncHandler(async (req: Request, res: Response) => {
        const { status, leaveType, startDate, endDate, userId, page, limit } = req.query;

        const result = await leaveService.getAllLeaves(
            status as string,
            leaveType as string,
            startDate ? new Date(startDate as string) : undefined,
            endDate ? new Date(endDate as string) : undefined,
            userId as string,
            page ? parseInt(page as string) : 1,
            limit ? parseInt(limit as string) : 10
        );

        new SuccessResponse(result, 'Leaves fetched successfully').send(res);
    });

    /**
     * Get pending leaves (Admin/Manager)
     */
    public getPendingLeaves = asyncHandler(async (req: Request, res: Response) => {
        const { page, limit } = req.query;

        const result = await leaveService.getPendingLeaves(
            page ? parseInt(page as string) : 1,
            limit ? parseInt(limit as string) : 10
        );

        new SuccessResponse(result, 'Pending leaves fetched successfully').send(res);
    });

    /**
     * Get leave by ID (All authenticated users)
     */
    public getLeaveById = asyncHandler(async (req: Request, res: Response) => {
        const { leaveId } = req.params;

        const leave = await leaveService.getLeaveById(leaveId);

        new SuccessResponse(leave, 'Leave fetched successfully').send(res);
    });

    /**
     * Approve leave (Admin/Manager)
     */
    public approveLeave = asyncHandler(async (req: Request, res: Response) => {
        const { leaveId } = req.params;
        const reviewerId = (req as AuthRequest).user.id;
        const { remarks } = req.body as { remarks?: string };

        const leave = await leaveService.approveLeave(leaveId, reviewerId, remarks);

        new SuccessResponse(leave, 'Leave approved successfully').send(res);
    });

    /**
     * Reject leave (Admin/Manager)
     */
    public rejectLeave = asyncHandler(async (req: Request, res: Response) => {
        const { leaveId } = req.params;
        const reviewerId = (req as AuthRequest).user.id;
        const { remarks } = req.body as { remarks: string };

        const leave = await leaveService.rejectLeave(leaveId, reviewerId, remarks);

        new SuccessResponse(leave, 'Leave rejected successfully').send(res);
    });

    /**
     * Get leave statistics
     */
    public getLeaveStatistics = asyncHandler(async (req: Request, res: Response) => {
        const { userId, year } = req.query;

        const statistics = await leaveService.getLeaveStatistics(
            userId as string,
            year ? parseInt(year as string) : undefined
        );

        new SuccessResponse(statistics, 'Leave statistics fetched successfully').send(res);
    });

    /**
     * Get user leave balance (Admin/HR)
     */
    public getUserLeaveBalance = asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const { year } = req.query;

        const balance = await leaveService.getLeaveBalance(
            userId,
            year ? parseInt(year as string) : undefined
        );

        new SuccessResponse(balance, 'Leave balance fetched successfully').send(res);
    });
}

export const leaveController = new LeaveController();

import { Router } from 'express';
import { leaveController } from '../controller/leave.controller';
import {
    authenticate,
    isManagerOrAbove,
    validateApplyLeave,
    validateApproveLeave,
    validateRejectLeave
} from '../middleware';

const router = Router();

// Employee routes
/**
 * @route   POST /api/leaves
 * @desc    Apply for leave
 * @access  Private (Authenticated)
 */
router.post('/', authenticate, validateApplyLeave, leaveController.applyLeave);

/**
 * @route   GET /api/leaves/my-leaves
 * @desc    Get my leave requests
 * @access  Private (Authenticated)
 */
router.get('/my-leaves', authenticate, leaveController.getMyLeaves);

/**
 * @route   GET /api/leaves/my-balance
 * @desc    Get my leave balance
 * @access  Private (Authenticated)
 */
router.get('/my-balance', authenticate, leaveController.getMyLeaveBalance);

/**
 * @route   PUT /api/leaves/:leaveId/cancel
 * @desc    Cancel my leave request
 * @access  Private (Authenticated)
 */
router.put('/:leaveId/cancel', authenticate, leaveController.cancelLeave);

// Manager/Admin routes
/**
 * @route   GET /api/leaves/pending
 * @desc    Get all pending leave requests
 * @access  Private (Manager/HR/Admin)
 */
router.get('/pending', authenticate, isManagerOrAbove, leaveController.getPendingLeaves);

/**
 * @route   GET /api/leaves/statistics
 * @desc    Get leave statistics
 * @access  Private (Manager/HR/Admin)
 */
router.get('/statistics', authenticate, isManagerOrAbove, leaveController.getLeaveStatistics);

/**
 * @route   GET /api/leaves
 * @desc    Get all leave requests with filters
 * @access  Private (Manager/HR/Admin)
 */
router.get('/', authenticate, isManagerOrAbove, leaveController.getAllLeaves);

/**
 * @route   GET /api/leaves/:leaveId
 * @desc    Get leave by ID
 * @access  Private (Authenticated)
 */
router.get('/:leaveId', authenticate, leaveController.getLeaveById);

/**
 * @route   POST /api/leaves/:leaveId/approve
 * @desc    Approve leave request
 * @access  Private (Manager/HR/Admin)
 */
router.post('/:leaveId/approve', authenticate, isManagerOrAbove, validateApproveLeave, leaveController.approveLeave);

/**
 * @route   POST /api/leaves/:leaveId/reject
 * @desc    Reject leave request
 * @access  Private (Manager/HR/Admin)
 */
router.post('/:leaveId/reject', authenticate, isManagerOrAbove, validateRejectLeave, leaveController.rejectLeave);

/**
 * @route   GET /api/leaves/user/:userId/balance
 * @desc    Get user leave balance
 * @access  Private (Manager/HR/Admin)
 */
router.get('/user/:userId/balance', authenticate, isManagerOrAbove, leaveController.getUserLeaveBalance);

export default router;

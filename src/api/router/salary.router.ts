import { Router } from 'express';
import { salaryController } from '../controller/salary.controller';
import {
    authenticate,
    isAdmin,
    isHROrAdmin,
    validateCreateSalary,
    validateUpdateSalaryStatus,
    validateProcessSalaryPayment
} from '../middleware';

const router = Router();

// Employee routes
/**
 * @route   GET /api/salaries/my-salaries
 * @desc    Get my salary records
 * @access  Private (Authenticated)
 */
router.get('/my-salaries', authenticate, salaryController.getMySalaries);

// Admin/HR routes
/**
 * @route   POST /api/salaries
 * @desc    Create salary record
 * @access  Private (Admin/HR)
 */
router.post('/', authenticate, isHROrAdmin, validateCreateSalary, salaryController.createSalary);

/**
 * @route   POST /api/salaries/bulk-generate
 * @desc    Generate bulk salaries for a month
 * @access  Private (Admin/HR)
 */
router.post('/bulk-generate', authenticate, isHROrAdmin, salaryController.generateBulkSalaries);

/**
 * @route   GET /api/salaries/statistics
 * @desc    Get salary statistics
 * @access  Private (Admin/HR)
 */
router.get('/statistics', authenticate, isHROrAdmin, salaryController.getSalaryStatistics);

/**
 * @route   GET /api/salaries
 * @desc    Get all salary records with filters
 * @access  Private (Admin/HR)
 */
router.get('/', authenticate, isHROrAdmin, salaryController.getAllSalaries);

/**
 * @route   GET /api/salaries/:salaryId
 * @desc    Get salary by ID
 * @access  Private (Authenticated - Employee can view own, Admin/HR can view all)
 */
router.get('/:salaryId', authenticate, salaryController.getSalaryById);

/**
 * @route   PUT /api/salaries/:salaryId/status
 * @desc    Update salary status
 * @access  Private (Admin/HR)
 */
router.put('/:salaryId/status', authenticate, isHROrAdmin, validateUpdateSalaryStatus, salaryController.updateSalaryStatus);

/**
 * @route   POST /api/salaries/:salaryId/process-payment
 * @desc    Process salary payment
 * @access  Private (Admin/HR)
 */
router.post(
    '/:salaryId/process-payment',
    authenticate,
    isHROrAdmin,
    validateProcessSalaryPayment,
    salaryController.processSalaryPayment
);

/**
 * @route   PUT /api/salaries/:salaryId
 * @desc    Update salary record
 * @access  Private (Admin/HR)
 */
router.put('/:salaryId', authenticate, isHROrAdmin, salaryController.updateSalary);

/**
 * @route   DELETE /api/salaries/:salaryId
 * @desc    Delete salary record
 * @access  Private (Admin only)
 */
router.delete('/:salaryId', authenticate, isAdmin, salaryController.deleteSalary);

export default router;

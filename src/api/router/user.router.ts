import { Router } from 'express';
import { userController } from '../controller/user.controller';
import {
    authenticate,
    isAdmin,
    isHROrAdmin,
    validateRegister,
    validateUpdateProfile,
    validateChangePassword,
    validateApproveUser,
    validateRejectUser,
    validateUpdateUserRoles,
    validateToggleUserStatus
} from '../middleware';

const router = Router();

// Public routes
/**
 * @route   POST /api/users/register
 * @desc    Register a new user (status: pending)
 * @access  Public
 */
router.post('/register', validateRegister, userController.register);

// Authenticated routes
/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private (Authenticated)
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private (Authenticated)
 */
router.put('/profile', authenticate, validateUpdateProfile, userController.updateProfile);

/**
 * @route   PUT /api/users/change-password
 * @desc    Change user password
 * @access  Private (Authenticated)
 */
router.put('/change-password', authenticate, validateChangePassword, userController.changePassword);

// Admin/HR routes
/**
 * @route   GET /api/users/pending
 * @desc    Get all pending user requests
 * @access  Private (Admin/HR)
 */
router.get('/pending', authenticate, isHROrAdmin, userController.getPendingUsers);

/**
 * @route   GET /api/users
 * @desc    Get all users with filters
 * @access  Private (Admin/HR)
 */
router.get('/', authenticate, isHROrAdmin, userController.getAllUsers);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user by ID
 * @access  Private (Admin/HR)
 */
router.get('/:userId', authenticate, isHROrAdmin, userController.getUserById);

/**
 * @route   POST /api/users/:userId/approve
 * @desc    Approve a pending user
 * @access  Private (Admin/HR)
 */
router.post('/:userId/approve', authenticate, isHROrAdmin, validateApproveUser, userController.approveUser);

/**
 * @route   POST /api/users/:userId/reject
 * @desc    Reject a pending user
 * @access  Private (Admin/HR)
 */
router.post('/:userId/reject', authenticate, isHROrAdmin, validateRejectUser, userController.rejectUser);

/**
 * @route   PUT /api/users/:userId
 * @desc    Update user details
 * @access  Private (Admin/HR)
 */
router.put('/:userId', authenticate, isHROrAdmin, validateUpdateProfile, userController.updateUser);

/**
 * @route   PUT /api/users/:userId/roles
 * @desc    Update user roles
 * @access  Private (Admin only)
 */
router.put('/:userId/roles', authenticate, isAdmin, validateUpdateUserRoles, userController.updateUserRoles);

/**
 * @route   PUT /api/users/:userId/status
 * @desc    Suspend or activate user
 * @access  Private (Admin/HR)
 */
router.put('/:userId/status', authenticate, isHROrAdmin, validateToggleUserStatus, userController.toggleUserStatus);

/**
 * @route   DELETE /api/users/:userId
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete('/:userId', authenticate, isAdmin, userController.deleteUser);

export default router;

import { Router } from 'express';
import userRouter from './user.router';
import authRouter from './auth.router';
import leaveRouter from './leave.router';
import salaryRouter from './salary.router';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/leaves', leaveRouter);
router.use('/salaries', salaryRouter);

export default router;

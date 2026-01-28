import { Router } from 'express';
import userRouter from './user.router';
import authRouter from './auth.router';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);

export default router;

import { ENV } from './constant';
import { app } from './app';
import { io, onConnection } from './socket';
import { connectDB } from './config';
import { logger } from './util';
import { initRateLimiter } from './config/rateLimiter.config';
import { keepAliveService, emailService } from './service';
import mongoose from 'mongoose';

io.on('connection', onConnection);
app.listen(ENV.PORT, () => {
    void (async () => {
        try {
            await connectDB();
            initRateLimiter(mongoose.connection);
            
            // Verify email service connection
            logger.info('Verifying email service connection...');
            const emailConnected = await emailService.verifyConnection();
            if (!emailConnected) {
                logger.warn('⚠️  Email service connection failed! Registration will not work properly. Check your email configuration.');
                logger.warn('Email Config Check:', {
                    meta: {
                        EMAIL_HOST: process.env.EMAIL_HOST,
                        EMAIL_PORT: process.env.EMAIL_PORT,
                        EMAIL_USER: process.env.EMAIL_USER,
                        HAS_EMAIL_PASSWORD: !!process.env.EMAIL_PASSWORD
                    }
                });
            }
            
            // Start keep-alive service for Render free tier
            keepAliveService.start();
            
            logger.info('Environment', {
                meta: {
                    PORT: ENV.PORT,
                    ENVIORNMENT: ENV.ENVIORNMENT
                }
            });
        } catch (error) {
            logger.error('Error while starting the server', { meta: error });
            process.exit(1);
        }
    })();
});

// Optionally handle uncaught exceptions and unhandled rejections here
process.on('uncaughtException', error => {
    logger.error('Uncaught Exception', { meta: error });
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { meta: { reason, promise } });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    keepAliveService.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    keepAliveService.stop();
    process.exit(0);
});

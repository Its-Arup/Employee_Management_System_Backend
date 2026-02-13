import 'express-async-errors';
import cors from 'cors';
import http from 'http';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';
import { NotFoundResponse, quicker, SuccessResponse } from './util';
import { corsOptionsDelegate } from './config';
import { errorHandler } from './api/middleware';
import path from 'path';
import rateLimitMiddleware from './api/middleware/rateLimit.middleware';
import apiRouter from './api/router';
import { emailService } from './service';

const app = express();

const server = http.createServer(app);

app.use(helmet())
    .use(rateLimitMiddleware)
    .use(cookieParser())
    .use(cors(corsOptionsDelegate))
    .use(express.json())
    .use(express.static(path.join(__dirname, '../', 'public')))
    .use(express.urlencoded({ extended: true }));

app.use('/api/health', (_, res) => {
    new SuccessResponse(
        {
            application: quicker.getApplicationHealth(),
            system: quicker.getSystemHealth(),
            timeStamp: Date.now()
        },
        'Server is up and running'
    ).send(res);
});

// Email service test endpoint
app.use('/api/test-email', async (req, res) => {
    try {
        const startTime = Date.now();
        
        // Test 1: Verify connection
        const verifyStart = Date.now();
        const isConnected = await emailService.verifyConnection();
        const verifyTime = Date.now() - verifyStart;

        // Test 2: Send actual test email (optional - only if email param provided)
        let sendTest = null;
        const testEmailAddress = req.query.email as string || process.env.EMAIL_USER;
        
        if (testEmailAddress && isConnected) {
            sendTest = await emailService.sendTestEmail(testEmailAddress);
        }

        const totalTime = Date.now() - startTime;

        new SuccessResponse(
            {
                timestamp: new Date().toISOString(),
                connectionTest: {
                    status: isConnected ? 'connected' : 'failed',
                    timeMs: verifyTime,
                    timeSec: (verifyTime / 1000).toFixed(2)
                },
                sendTest: sendTest ? {
                    status: sendTest.success ? 'sent' : 'failed',
                    timings: sendTest.timings,
                    error: sendTest.error
                } : 'skipped (add ?email=your@email.com to test actual sending)',
                config: {
                    host: process.env.EMAIL_HOST,
                    port: process.env.EMAIL_PORT,
                    user: process.env.EMAIL_USER,
                    hasPassword: !!process.env.EMAIL_PASSWORD
                },
                totalTimeMs: totalTime,
                totalTimeSec: (totalTime / 1000).toFixed(2)
            },
            isConnected ? 'Email service test completed' : 'Email service connection failed'
        ).send(res);
    } catch (error) {
        new SuccessResponse(
            {
                emailService: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            'Email service test failed'
        ).send(res);
    }
});

// API Routes
app.use('/api', apiRouter);

app.use('*', (_, res) => {
    new NotFoundResponse('Route not found.').send(res);
});

app.use(errorHandler);

export { server as app };

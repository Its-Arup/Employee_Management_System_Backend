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
app.use('/api/test-email', async (_, res) => {
    try {
        const isConnected = await emailService.verifyConnection();
        new SuccessResponse(
            {
                emailService: isConnected ? 'connected' : 'failed',
                config: {
                    host: process.env.EMAIL_HOST,
                    port: process.env.EMAIL_PORT,
                    user: process.env.EMAIL_USER,
                    hasPassword: !!process.env.EMAIL_PASSWORD
                }
            },
            isConnected ? 'Email service is working!' : 'Email service connection failed'
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

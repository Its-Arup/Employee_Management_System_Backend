import { ENV } from '../../constant';
import { ApplicationEnvironment } from '../../types';
import { ApiError, InternalError, logger } from '../../util';
import { NextFunction, Request, Response } from 'express';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, _req: Request, res: Response, next: NextFunction) => {
    // Always log errors to server logs (for debugging in production)
    logger.error('Error Handler', { 
        meta: {
            error: err,
            message: err instanceof Error ? err.message : 'Unknown error',
            stack: err instanceof Error ? err.stack : undefined,
            url: _req.url,
            method: _req.method,
            body: _req.body
        }
    });

    if (err instanceof ApiError) {
        ApiError.handle(err, res);
    } else {
        if (ENV.ENVIORNMENT === ApplicationEnvironment.DEVELOPMENT) {
            res.status(500).send({ error: err });
        } else {
            // In production, hide error details from client but they're logged above
            ApiError.handle(new InternalError('An unexpected error occurred'), res);
        }
    }
};

import { ENV } from '../../constant';
import { ApplicationEnvironment } from '../../types';
import { ApiError, InternalError, logger } from '../../util';
import { NextFunction, Request, Response } from 'express';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (ENV.ENVIORNMENT === ApplicationEnvironment.DEVELOPMENT) {
        logger.error('Error Handler', { meta: err });
    }

    if (err instanceof ApiError) {
        ApiError.handle(err, res);
    } else {
        if (ENV.ENVIORNMENT === ApplicationEnvironment.DEVELOPMENT) {
            res.status(500).send({ error: err });
        } else {
            ApiError.handle(new InternalError('An unexpected error occurred'), res);
        }
    }
};

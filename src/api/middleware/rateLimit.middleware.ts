import { NextFunction, Request, Response } from 'express';
import { ApplicationEnvironment } from '../../types';
import { ENV } from '../../constant';
import { rateLimiterMongo } from '../../config';
import { ForbiddenError } from '../../util';

export default (req: Request, _: Response, next: NextFunction) => {
    if (ENV.ENVIORNMENT === ApplicationEnvironment.DEVELOPMENT) {
        return next();
    }

    if (rateLimiterMongo) {
        rateLimiterMongo

            .consume(req.ip as string, 1)

            .then(() => {
                next();
            })

            .catch(() => {
                next(new ForbiddenError('Too Many Requests'));
            });
    }
};

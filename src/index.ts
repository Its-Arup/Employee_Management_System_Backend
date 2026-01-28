import { ENV } from './constant';
import { app } from './app';
import { io, onConnection } from './socket';
import { connectDB } from './config';
import { logger } from './util';
import { initRateLimiter } from './config/rateLimiter.config';
import mongoose from 'mongoose';

io.on('connection', onConnection);
app.listen(ENV.PORT, () => {
    void (async () => {
        try {
            await connectDB();
            initRateLimiter(mongoose.connection);
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

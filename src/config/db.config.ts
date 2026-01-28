import mongoose from 'mongoose';
import { ENV } from '../constant';
import { logger } from '../util';

export const connectDB = async () => {
    await mongoose.connect(ENV.DB_URL);
    logger.info('MONGODB Connected', { meta: { host: mongoose.connection.host, name: mongoose.connection.name } });
};

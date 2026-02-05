import DotenvFlow from 'dotenv-flow';
import { env } from 'process';

DotenvFlow.config();

export const ENV = {
    ENVIORNMENT: env.NODE_ENV,
    PORT: parseInt(env.PORT!),
    JWT_SECRET: env.JWT_SECRET!,
    ENCRYPTION_KEY: env.ENCRYPTION_KEY!,
    IV: env.IV!,
    EMAIL_HOST: env.EMAIL_HOST!,
    EMAIL_PORT: parseInt(env.EMAIL_PORT!),
    EMAIL_USER: env.EMAIL_USER!,
    EMAIL_PASSWORD: env.EMAIL_PASSWORD!,
    EMAIL_FROM: env.EMAIL_FROM!,
    EMAIL_FROM_NAME: env.EMAIL_FROM_NAME || 'Employee Management System',
    FRONTEND_URL: env.FRONTEND_URL!,
    get DB_URL() {
        return env.DB_URL! + this.ENVIORNMENT;
    }
};

type EnvKey = keyof typeof ENV;

Object.keys(ENV).forEach(key => {
    const value = ENV[key as EnvKey];
    if (!value) {
        throw new Error(`Environment variable ${key} is not defined or is empty`);
    }
});

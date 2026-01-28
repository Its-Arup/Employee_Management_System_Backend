import DotenvFlow from 'dotenv-flow';
import { env } from 'process';

DotenvFlow.config();

export const ENV = {
    ENVIORNMENT: env.NODE_ENV,
    PORT: parseInt(env.PORT!),
    JWT_SECRET: env.JWT_SECRET!,
    ENCRYPTION_KEY: env.ENCRYPTION_KEY!,
    IV: env.IV!,
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

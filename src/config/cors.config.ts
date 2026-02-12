import { CorsOptionsDelegate, CorsRequest } from 'cors';
import { ENV } from '../constant';
import { ApplicationEnvironment } from '../types';

export const allowList = ['http://localhost:3000', 'http://localhost:5173', 'https://employee-management-system-lime-iota.vercel.app'];

if (ENV.ENVIORNMENT === ApplicationEnvironment.PRODUCTION) {
    allowList.shift();
}

export const corsOptionsDelegate: CorsOptionsDelegate<CorsRequest> = (req, callback) => {
    const environment = ENV.ENVIORNMENT;
    if (environment != ApplicationEnvironment.PRODUCTION) {
        callback(null, { origin: true, credentials: true });
        return;
    }

    let corsOptions = {};
    if (req.headers.origin && allowList.indexOf(req.headers.origin) !== -1) {
        corsOptions = { origin: true, credentials: true };
    } else {
        corsOptions = { origin: false };
    }
    callback(null, corsOptions);
};

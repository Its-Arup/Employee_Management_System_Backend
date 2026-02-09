import { Response } from 'express';
import { AccessTokenErrorResponse, AuthFailureResponse, BadRequestErrorResponse, InternalErrorResponse, NotFoundResponse, ForbiddenResponse } from './apiResponse';
import { ENV } from '../constant';
import { ApplicationEnvironment } from '../types';

export enum ErrorType {
    TOKEN_EXPIRED = 'TokenExpiredError',
    UNAUTHORIZED = 'AuthFailureError',
    ACCESS_TOKEN = 'AccessTokenError',
    INTERNAL = 'InternalError',
    NOT_FOUND = 'NotFoundError',
    BAD_REQUEST = 'BadRequestError',
    FORBIDDEN = 'ForbiddenError'
}

export abstract class ApiError extends Error {
    constructor(
        public type: ErrorType,
        public message: string
    ) {
        super(type);
    }

    public static handle(err: ApiError, res: Response): Response {
        switch (err.type) {
            case ErrorType.TOKEN_EXPIRED:
            case ErrorType.UNAUTHORIZED:
                return new AuthFailureResponse(err.message).send(res);
            case ErrorType.ACCESS_TOKEN:
                return new AccessTokenErrorResponse(err.message).send(res);
            case ErrorType.NOT_FOUND:
                return new NotFoundResponse(err.message).send(res);
            case ErrorType.FORBIDDEN:
                return new ForbiddenResponse(err.message).send(res);
            case ErrorType.BAD_REQUEST:
                return new BadRequestErrorResponse(err.message).send(res);
            default: {
                let message = err.message;
                if (ENV.ENVIORNMENT === ApplicationEnvironment.PRODUCTION) message = 'Something wrong happened.';
                return new InternalErrorResponse(message).send(res);
            }
        }
    }
}

// now we can use the ApiError class to handle errors in our application
export class AuthFailureError extends ApiError {
    constructor(message = 'Authentication Failure') {
        super(ErrorType.UNAUTHORIZED, message);
    }
}

export class ForbiddenError extends ApiError {
    constructor(message = 'Forbidden') {
        super(ErrorType.FORBIDDEN, message);
    }
}

export class InternalError extends ApiError {
    constructor(message = 'Internal Server Error') {
        super(ErrorType.INTERNAL, message);
    }
}

export class AccessTokenError extends ApiError {
    constructor(message = 'Access Token Invalid') {
        super(ErrorType.ACCESS_TOKEN, message);
    }
}

export class NotFoundError extends ApiError {
    constructor(message = 'Not Found') {
        super(ErrorType.NOT_FOUND, message);
    }
}

export class BadRequestError extends ApiError {
    constructor(message = 'Bad Request') {
        super(ErrorType.BAD_REQUEST, message);
    }
}

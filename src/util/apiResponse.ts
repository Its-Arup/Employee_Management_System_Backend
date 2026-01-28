import { Response } from 'express';

export enum ResponseStatus {
    SUCCESS = 200,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    INTERNAL_ERROR = 500
}

abstract class ApiResponse {
    constructor(
        protected status: number,
        protected message: string,
        protected success: boolean
    ) {}

    protected prepare<T extends ApiResponse>(res: Response, response: T) {
        return res.status(this.status).json(response);
    }

    public send(res: Response) {
        return this.prepare<ApiResponse>(res, this);
    }
}

export class SuccessResponse<T> extends ApiResponse {
    constructor(
        protected data?: T,
        message = 'Success'
    ) {
        super(ResponseStatus.SUCCESS, message, true);
    }

    public send(res: Response): Response {
        return super.prepare<SuccessResponse<T>>(res, this);
    }
}

export class AuthFailureResponse extends ApiResponse {
    constructor(message = 'Authentication Failure') {
        super(ResponseStatus.UNAUTHORIZED, message, false);
    }
}

export class NotFoundResponse extends ApiResponse {
    constructor(message = 'Not Found') {
        super(ResponseStatus.NOT_FOUND, message, false);
    }
}

export class ForbiddenResponse extends ApiResponse {
    constructor(message = 'Forbidden') {
        super(ResponseStatus.FORBIDDEN, message, false);
    }
}

export class InternalErrorResponse extends ApiResponse {
    constructor(message = 'Internal Server Error') {
        super(ResponseStatus.INTERNAL_ERROR, message, false);
    }
}

export class AccessTokenErrorResponse extends ApiResponse {
    constructor(message = 'Access Token Invalid') {
        super(ResponseStatus.UNAUTHORIZED, message, false);
    }
}

export class BadRequestErrorResponse extends ApiResponse {
    constructor(message = 'Bad Request') {
        super(ResponseStatus.BAD_REQUEST, message, false);
    }
}

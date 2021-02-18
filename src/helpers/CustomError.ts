export class CustomError {
    readonly message: string;
    readonly statusCode: StatusCode;

    constructor(statusCode: StatusCode, message: string = '') {
        this.statusCode = statusCode;
        this.message = message;
    }
}

export enum StatusCode {
    BrsUnauthorized = 1,
    GoogleUnauthorized
}

export class Logger {
    private logHandlers?: ((message: string) => void)[];
    private errorHandlers?: ((errorMessage: string) => void)[];

    addLogHandler(logHandler: ((message: string) => void)) {
        if (!this.logHandlers)
            this.logHandlers = [];
        this.logHandlers.push(logHandler);
    }

    removeLogHandler(logHandler: ((message: string) => void)) {
        if (!this.logHandlers)
            return;
        this.logHandlers = this.logHandlers.filter(h => h !== logHandler);
    }

    addErrorHandler(errorHandler: (errorMessage: string) => void) {
        if (!this.errorHandlers)
            this.errorHandlers = [];
        this.errorHandlers.push(errorHandler);
    }

    removeErrorHandler(errorHandler: ((errorMessage: string) => void)) {
        if (!this.errorHandlers)
            return;
        this.errorHandlers = this.errorHandlers.filter(h => h !== errorHandler);
    }

    log(message: string) {
        if (!this.logHandlers)
            return;
        for (const logHandler of this.logHandlers)
            logHandler(message);
    }

    error(errorMessage: string) {
        if (!this.errorHandlers)
            return;
        for (const errorHandler of this.errorHandlers)
            errorHandler(errorMessage);
    }
}

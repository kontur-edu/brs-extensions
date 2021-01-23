export class Logger {
    private logHandlers?: ((message: string) => void)[];
    private errorHandler?: ((errorMessage: string) => void)[];

    addLogHandler(logHandler: ((message: string) => void)) {
        if (!this.logHandlers)
            this.logHandlers = [];
        this.logHandlers.push(logHandler);
    }

    addErrorHandler(errorHandler: (errorMessage: string) => void) {
        if (!this.errorHandler)
            this.errorHandler = [];
        this.errorHandler.push(errorHandler);
    }

    log(message: string) {
        if (!this.logHandlers)
            return;
        for (const logHandler of this.logHandlers)
            logHandler(message);
    }

    error(errorMessage: string) {
        if (!this.errorHandler)
            return;
        for (const errorHandler of this.errorHandler)
            errorHandler(errorMessage);
    }
}

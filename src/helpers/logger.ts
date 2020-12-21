export class Logger{
    private logProviders?: ((message: string) => void)[];
    private errorProviders?: ((errorMessage: string) => void)[];

    addLogProvider(logProvider: ((message: string) => void)){
        if (!this.logProviders)
            this.logProviders = [];
        this.logProviders.push(logProvider);
    }

    addErrorProvider(errorProvider: (errorMessage: string) => void){
        if (!this.errorProviders)
            this.errorProviders = [];
        this.errorProviders.push(errorProvider);
    }

    log(message: string){
        if (!this.logProviders)
            return;
        for (const logProvider of this.logProviders)
            logProvider(message);
    }

    error(errorMessage: string){
        if (!this.errorProviders)
            return;
        for (const errorProvider of this.errorProviders)
            errorProvider(errorMessage);
    }
}

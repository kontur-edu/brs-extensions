export default class BrsUrlProvider {
    private readonly withProxy: boolean;
    private readonly brsProxy = "https://brs-proxy.herokuapp.com";
    private readonly brsUrl = 'https://brs.urfu.ru/mrd';

    constructor(withProxy: boolean) {
        this.withProxy = withProxy;
    }

    get baseUrl() {
        return this.withProxy ?
            `${this.brsProxy}/brs/${this.brsUrl}` :
            this.brsUrl;
    }
}

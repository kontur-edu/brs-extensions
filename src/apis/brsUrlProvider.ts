export default class BrsUrlProvider {
    private readonly withProxy: boolean;
    private readonly brsUrl = 'https://brs.urfu.ru/mrd';
    private readonly corsProxy = 'https://kamikoto-cors-proxy.herokuapp.com';

    constructor(withProxy: boolean) {
        this.withProxy = withProxy;
    }

    get baseUrl() {
        return this.withProxy ?
            `${this.corsProxy}/${this.brsUrl}` :
            this.brsUrl;
    }
}

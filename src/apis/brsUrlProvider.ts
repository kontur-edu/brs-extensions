const brsUrl = 'https://brs.urfu.ru/mrd';
const corsProxy = 'https://kamikoto-cors-proxy.herokuapp.com';

export default class BrsUrlProvider {
    private readonly withProxy: boolean;

    constructor(withProxy: boolean) {
        this.withProxy = withProxy;
    }

    get baseUrl() {
        return this.withProxy ? `${corsProxy}/${brsUrl}` : brsUrl;
    }
}

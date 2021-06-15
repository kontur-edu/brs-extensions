import {BRS_URL, CORS_PROXY} from "../Constants";

export default class BrsUrlProvider {
    private readonly withProxy: boolean;

    constructor(withProxy: boolean) {
        this.withProxy = withProxy;
    }

    get baseUrl() {
        return this.withProxy ? `${CORS_PROXY}/${BRS_URL}` : BRS_URL;
    }
}

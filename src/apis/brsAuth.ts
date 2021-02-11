import request from "request-promise";
import BrsUrlProvider from "./brsUrlProvider";
import * as cache from "../helpers/cache";

export default class BrsAuth {
    readonly brsUrlProvider: BrsUrlProvider;

    constructor(brsUrlProvider: BrsUrlProvider) {
        this.brsUrlProvider = brsUrlProvider;
        this.tryLoadLoginInfoFromCache();
    }

    private _sid: string | null = null;

    get sid() {
        if (!this._sid)
            this.loadLoginInfoFromCache();
        return this._sid;
    }

    private _login: string | null = null;

    get login() {
        if (!this._login)
            this.loadLoginInfoFromCache();
        return this._login;
    }

    checkAuth() {
        return !!(this._sid && this._login);
    }

    async loginAsync(login: string, password: string): Promise<boolean> {
        const response = await this.requestSidAsync(login, password);

        if (!response || !('x-set-cookie' in response.headers)) {
            return false;
        }

        const cookie = response.headers['x-set-cookie'] as string;
        const result = cookie.match(/(?<=JSESSIONID=)\w+/);

        if (!result)
            return false;

        const sid = result[0];
        this.saveLoginInfo(sid, login);

        return true;
    }

    async authBySidAsync(sid: string): Promise<boolean> {
        if (!sid)
            return false;

        cache.save('loginInfo', {sid: sid, login: 'SESSION'});

        return true;
    }

    private saveLoginInfo(sid: string, login: string) {
        cache.save('loginInfo', {sid, login});
        this._sid = sid;
        this._login = login;
    }

    logout() {
        this._sid = null;
        this._login = null;
        cache.clear('loginInfo');
    }

    private async requestSidAsync(login: string, password: string) {
        return await request({
            url: this.brsUrlProvider.baseUrl + `/login`,
            method: 'POST',
            body: `username=${login}&password=${password}`,
            resolveWithFullResponse: true,
            simple: false,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
        }).then(x => x, () => null);
    }

    private loadLoginInfoFromCache() {
        if (!this.tryLoadLoginInfoFromCache())
            throw new Error('BRS unauthorized');
    }

    private tryLoadLoginInfoFromCache() {
        const loginInfo = cache.read<{ sid: string, login: string }>('loginInfo');
        if (!loginInfo)
            return false;

        this._sid = loginInfo.sid;
        this._login = loginInfo.login;

        return true;
    }
}

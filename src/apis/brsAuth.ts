import request from "request-promise";
import BrsUrlProvider from "./brsUrlProvider";
import * as cache from "../helpers/cache";

export default class BrsAuth {
    private brsUrlProvider: BrsUrlProvider;
    private _sid: string | null = null;
    private _login: string | null = null;

    constructor(brsUrlProvider: BrsUrlProvider) {
        this.brsUrlProvider = brsUrlProvider;
    }

    get sid() {
        if (!this._sid)
            this.loadLoginInfo();
        return this._sid;
    }

    get login() {
        if (!this._login)
            this.loadLoginInfo();
        return this._login;
    }

    private loadLoginInfo() {
        const loginInfo = cache.read<{ sid: string, login: string }>('loginInfo');
        if (!loginInfo)
            throw new Error('BrsAuth unauthorized');
        this._sid = loginInfo.sid;
        this._login = loginInfo.login;
    }

    checkAuth() {
        try {
            this.loadLoginInfo();
            return true;
        } catch {
            return false;
        }
    }

    async authAsync(login: string, password: string): Promise<boolean> {
        const response = await request({
            url: this.brsUrlProvider.baseUrl + `/login`,
            method: 'POST',
            body: `username=${login}&password=${password}`,
            resolveWithFullResponse: true,
            simple: false,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
        });
        if (!('set-cookie' in response.headers)) {
            cache.save('loginInfo', {sid: '7EF7122088BA63A71BDC0DE022FC2C97', login});
            return true;
        }
        const sessionCookie = response.headers['set-cookie']
            .filter((cookie: string) => cookie.startsWith('JSESSIONID='))[0];
        const sid = (sessionCookie as string)
            .split(';')[0]
            .substr('JSESSIONID='.length)
            .trim();

        cache.save('loginInfo', {sid, login});

        return true;
    }
}

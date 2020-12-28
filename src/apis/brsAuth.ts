import request from "request-promise";
import BrsUrlProvider from "./brsUrlProvider";
import * as cache from "../helpers/cache";

export default class BrsAuth {
    private brsUrlProvider: BrsUrlProvider;

    constructor(brsUrlProvider: BrsUrlProvider) {
        this.brsUrlProvider = brsUrlProvider;
    }

    private _sid: string | null = null;

    get sid() {
        if (!this._sid)
            this.loadLoginInfo();
        return this._sid;
    }

    private _login: string | null = null;

    get login() {
        if (!this._login)
            this.loadLoginInfo();
        return this._login;
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
        const response = await this.getSid(login, password);

        if (!response || !('x-set-cookie' in response.headers)) {
            return false;
        }

        const cookies = response.headers['x-set-cookie'] as string;
        const result = cookies.match(/(?<=JSESSIONID=)\w+/);

        if (!result)
            return false;

        cache.save('loginInfo', {sid: result[0], login});

        return true;
    }

    async getSid(login: string, password: string) {
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

    private loadLoginInfo() {
        const loginInfo = cache.read<{ sid: string, login: string }>('loginInfo');
        if (!loginInfo)
            throw new Error('BrsAuth unauthorized');
        this._sid = loginInfo.sid;
        this._login = loginInfo.login;
    }
}

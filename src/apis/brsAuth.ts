import request from "request-promise";
import BrsUrlProvider from "./brsUrlProvider";
import * as cache from "../helpers/cache";
import {StorageType} from "../helpers/cache";
import {CustomError, StatusCode} from "../helpers/CustomError";

export default class BrsAuth {
    readonly brsUrlProvider: BrsUrlProvider;

    constructor(brsUrlProvider: BrsUrlProvider) {
        this.brsUrlProvider = brsUrlProvider;
    }

    private _sid: string | null = null;

    get sid() {
        if (!this._sid)
            throw new CustomError(StatusCode.BrsUnauthorized, 'BRS unauthorized');
        return this._sid;
    }

    private _cacheName: string | null = null;

    get cacheName() {
        if (!this._cacheName)
            throw new CustomError(StatusCode.BrsUnauthorized, 'BRS unauthorized');
        return this._cacheName;
    }

    private _username?: string = "Anonymous";

    get username() {
        return this._username;
    }

    checkAuth() {
        return !!(this._sid && this._cacheName);
    }

    async tryRestoreAsync() {
        if (!!(this._sid && this._cacheName))
            return;

        let loginInfo = cache.read<LoginInfo>("loginInfo", StorageType.Session);
        if (loginInfo) {
            this.saveLoginInfo(loginInfo.sid, loginInfo.username);
            return;
        }

        loginInfo = cache.read<LoginInfo>("loginInfo", StorageType.Local);
        if (!loginInfo)
            return;

        const sidCheckResult = await this.checkSidAsync(loginInfo.sid);
        if (sidCheckResult?.success)
            this.saveLoginInfo(loginInfo.sid, loginInfo.username);
    }

    private async checkSidAsync(sid: string): Promise<SidCheckResult | null> {
        try {
            const response: string = await request({
                method: 'GET',
                url: this.brsUrlProvider.baseUrl + "/mvc/mobile",
                headers: {
                    'X-Cookie': `JSESSIONID=${sid}`,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const username = response.match(/username">([А-ЯЁа-яё \-]+)</);
            if (username)
                return {success: true, username: username[1]};
            return {success: false, username: "Anonymous"}

        } catch (e) {
            return null;
        }
    }

    async loginAsync(login: string, password: string): Promise<LoginStatus> {
        const response = await this.requestSidAsync(login, password);

        if (!response || !('x-set-cookie' in response.headers)) {
            return LoginStatus.Error;
        }

        const cookie = response.headers['x-set-cookie'] as string;
        const result = cookie.match(/(?<=JSESSIONID=)\w+/);

        if (!result)
            return LoginStatus.Error;

        const sid = result[0];

        const checkResult = await this.checkSidAsync(sid);
        if (checkResult === null)
            return LoginStatus.Error;
        if (!checkResult.success)
            return LoginStatus.InvalidCredentials;

        this.saveLoginInfo(sid, checkResult.username);

        return LoginStatus.Succeed;
    }

    async authBySidAsync(sid: string): Promise<LoginStatus> {
        if (!sid)
            return LoginStatus.InvalidCredentials;

        const checkResult = await this.checkSidAsync(sid);
        if (checkResult === null)
            return LoginStatus.Error;
        if (!checkResult.success)
            return LoginStatus.InvalidCredentials;

        this.saveLoginInfo(sid, checkResult.username);

        return LoginStatus.Succeed;
    }

    private saveLoginInfo(sid: string, username: string) {
        const cacheName = username.replaceAll(' ', '_');

        cache.save("loginInfo", {sid, cacheName, username}, StorageType.LocalAndSession);

        this._sid = sid;
        this._cacheName = cacheName;
        this._username = username;
    }

    logout() {
        this._sid = null;
        this._cacheName = null;
        cache.clear("loginInfo", StorageType.LocalAndSession);
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
}

export enum LoginStatus {
    Succeed,
    InvalidCredentials,
    Error
}

interface LoginInfo {
    sid: string;
    cacheName: string;
    username: string;
}

interface SidCheckResult {
    success: boolean;
    username: string;
}

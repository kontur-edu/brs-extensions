import request from "request-promise";
import BrsUrlProvider from "./BrsUrlProvider";
import * as cache from "../helpers/cache";
import {StorageType} from "../helpers/cache";
import {CustomError, StatusCode} from "../helpers/CustomError";

export enum LoginStatus {
    Succeed,
    InvalidCredentials,
    Error
}

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

    private _safeUserName: string | null = null;

    get safeUserName() {
        if (!this._safeUserName)
            throw new CustomError(StatusCode.BrsUnauthorized, 'BRS unauthorized');
        return this._safeUserName;
    }

    private _userName?: string = "Anonymous";

    get userName() {
        return this._userName;
    }

    checkAuth() {
        return !!(this._sid && this._safeUserName);
    }

    async tryRestoreAsync() {
        if (!!(this._sid && this._safeUserName))
            return;

        let loginInfo = cache.read<LoginInfo>("loginInfo", StorageType.Session);
        if (loginInfo) {
            this.saveLoginInfo(loginInfo.sid, loginInfo.userName);
            return;
        }

        loginInfo = cache.read<LoginInfo>("loginInfo", StorageType.Local);
        if (!loginInfo)
            return;

        const sidCheckResult = await this.checkSidAsync(loginInfo.sid);
        if (sidCheckResult?.success)
            this.saveLoginInfo(loginInfo.sid, loginInfo.userName);
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

            const userName = response.match(/username">([А-ЯЁа-яё \-]+)</);
            if (userName)
                return {success: true, userName: userName[1]};
            return {success: false, userName: "Anonymous"}

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

        this.saveLoginInfo(sid, checkResult.userName);

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

        this.saveLoginInfo(sid, checkResult.userName);

        return LoginStatus.Succeed;
    }

    private saveLoginInfo(sid: string, userName: string) {
        const safeUserName = userName.replaceAll(/[^A-Za-zА-ЯЁа-яё]/, '_');

        cache.save("loginInfo", {sid, safeUserName, userName}, StorageType.LocalAndSession);

        this._sid = sid;
        this._safeUserName = safeUserName;
        this._userName = userName;
    }

    logout() {
        this._sid = null;
        this._safeUserName = null;
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

interface LoginInfo {
    sid: string;
    safeUserName: string;
    userName: string;
}

interface SidCheckResult {
    success: boolean;
    userName: string;
}

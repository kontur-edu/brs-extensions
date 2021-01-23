const CLIENT_ID = '122993083593-pacve8csj86voko30ia65raeg0ncrtuv.apps.googleusercontent.com';
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

let onAuthStatusChangedEvent: (isSignedIn: boolean) => void;
let onErrorEvent: (error: any) => void;

const googleAuth = {
    async init() {
        // @ts-ignore
        if (gapi.client)
            return;
        await new Promise(res => {
            gapi.load('client:auth2', async () => {
                await gapi.client.init({
                    clientId: CLIENT_ID,
                    discoveryDocs: DISCOVERY_DOCS,
                    scope: SCOPES
                }).then(() => {
                    if (!onAuthStatusChangedEvent)
                        return;
                    // @ts-ignore
                    const signedIn = gapi.auth2.getAuthInstance().isSignedIn;
                    signedIn.listen(onAuthStatusChangedEvent);
                }, onErrorEvent);
                res();
            });
        });
    },

    checkAuth() {
        // @ts-ignore
        return gapi.auth2?.getAuthInstance()?.isSignedIn?.get();
    },
};

export default googleAuth;

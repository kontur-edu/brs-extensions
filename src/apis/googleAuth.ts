const CLIENT_ID = '122993083593-pacve8csj86voko30ia65raeg0ncrtuv.apps.googleusercontent.com';
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
const SCOPES = "profile email https://www.googleapis.com/auth/spreadsheets";

const googleAuth = {
    async init() {
        // @ts-ignore
        if (gapi.client)
            return;
        return new Promise(resolve => {
            gapi.load('client:auth2', async () => {
                await gapi.client.init({
                    clientId: CLIENT_ID,
                    discoveryDocs: DISCOVERY_DOCS,
                    scope: SCOPES
                }).catch(console.error);
                resolve();
            });
        });
    },

    checkAuthorized() {
        // @ts-ignore
        return gapi.auth2?.getAuthInstance()?.isSignedIn?.get();
    },

    getUsername(): string | undefined {
        // @ts-ignore
        const username = gapi.auth2?.getAuthInstance().currentUser?.get().getBasicProfile().getName();
        if (username)
            return username;

        // @ts-ignore
        return gapi.auth2?.getAuthInstance().currentUser?.get().getBasicProfile().getEmail();
    },

    async logout() {
        // @ts-ignore
        await gapi.auth2?.getAuthInstance()?.signOut();
    }
};

export default googleAuth;

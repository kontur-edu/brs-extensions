const CLIENT_ID = '122993083593-pacve8csj86voko30ia65raeg0ncrtuv.apps.googleusercontent.com';
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
const SCOPES = "profile email https://www.googleapis.com/auth/spreadsheets";

export default class GoogleAuth {
    async ensureInitializedAsync() {
        if (gapi.client)
            return;
        return new Promise<void>(resolve => {
            gapi.load('client:auth2', async () => {
                await gapi.client.init({
                    clientId: CLIENT_ID,
                    discoveryDocs: DISCOVERY_DOCS,
                    scope: SCOPES
                }).catch(console.error);
                resolve();
            });
        });
    }

    checkAuthorized() {
        return gapi.auth2?.getAuthInstance()?.isSignedIn?.get();
    }

    getUserName(): string | undefined {
        const basicProfile = gapi.auth2?.getAuthInstance()?.currentUser?.get()?.getBasicProfile();
        return basicProfile?.getName() || basicProfile?.getEmail();
    }

    async logout() {
        await gapi.auth2?.getAuthInstance()?.signOut();
    }
}


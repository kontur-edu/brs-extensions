let CLIENT_ID: string;
let API_KEY: string;
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";
let initialized = false;

export function init(){
    loadData();
    gapi.load('client:auth2', initClient);
}

function loadData(){
    const googleApiKey = localStorage.getItem('google_api_key');
    if (!googleApiKey)
        throw 'No google api key found';
    API_KEY = googleApiKey;
    const googleClientId = localStorage.getItem('google_client_id');
    if (!googleClientId)
        throw 'No google client id';
    CLIENT_ID = googleClientId;
}

function initClient() {
    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
    }).then(() => {
        if (!events.onSignInStatusChanged)
            return;
        // @ts-ignore
        const signedIn = gapi.auth2.getAuthInstance().isSignedIn;
        // Listen for sign-in state changes.
        signedIn.listen(events.onSignInStatusChanged);
        // Handle the initial sign-in state.
        events.onSignInStatusChanged(signedIn.get());
    }, events.onError);
}

export function signIn() {
    if (!initialized)
        throw 'Not initialized';
    // @ts-ignore
    gapi.auth2.getAuthInstance().signIn();
}

export function signOut() {
    if (!initialized)
        throw 'Not initialized';
    // @ts-ignore
    gapi.auth2.getAuthInstance().signOut();
}

interface Events {
    onSignInStatusChanged?: (isSignedIn: boolean) => void;
    onError?: (error: any) => void;
}

export const events: Events = {
    onError: alert
}

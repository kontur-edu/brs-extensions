// Client ID and API key from the Developer Console
const CLIENT_ID = '';
const API_KEY = '';
// Array of API discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
// Authorization scopes required by the API; multiple scopes can be included, separated by spaces.
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

gapi.load('client:auth2', initClient);
/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
export const events: Events = {
    onError: alert
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
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

/**
 *  Sign in the user upon button click.
 */
export function signIn() {
    // @ts-ignore
    gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
export function signOut() {
    // @ts-ignore
    gapi.auth2.getAuthInstance().signOut();
}

interface Events{
    onSignInStatusChanged?: (isSignedIn: boolean) => void;
    onError?: (error: any) => void;
}
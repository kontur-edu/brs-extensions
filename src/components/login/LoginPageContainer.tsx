import React from 'react';
import Context from '../../Context';
import LoginPage from './LoginPage';

export default function LoginPageContainer() {
    return (
        <Context.Consumer>
            {({ brsAuth, googleAuth }) => (
                <LoginPage brsAuth={brsAuth} googleAuth={googleAuth} />
            )}
        </Context.Consumer>
    );
}

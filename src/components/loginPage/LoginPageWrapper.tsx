import React from 'react';
import Context from '../../Context';
import LoginPage from './index';

export default function LoginPageWrapper() {
    return (
        <Context.Consumer>
            {({ brsAuth, googleAuth }) => (
                <LoginPage brsAuth={brsAuth} googleAuth={googleAuth} />
            )}
        </Context.Consumer>
    );
}

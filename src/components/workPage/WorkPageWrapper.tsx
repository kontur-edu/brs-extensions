import React from 'react';
import Context from '../../Context';
import WorkPage from './WorkPage';

export default function WorkPageWrapper() {
    return (
        <Context.Consumer>
            {(context) => (
                <WorkPage
                    brsAuth={context.brsAuth}
                    brsApi={context.brsApi}
                    googleAuth={context.googleAuth}
                />
            )}
        </Context.Consumer>
    );
}

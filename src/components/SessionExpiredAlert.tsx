import React from 'react';
import {Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Slide} from '@material-ui/core';
import {TransitionProps} from '@material-ui/core/transitions';
import {Redirect} from 'react-router-dom';
import BrsAuth from "../apis/brsAuth";

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export default function SessionExpiredAlert({open, sessionName, brsAuth}: Props) {
    const [redirect, setRedirect] = React.useState(false);

    const handleOk = () => {
        brsAuth.logout();
        setRedirect(true);
    };

    return (
        <React.Fragment>
            {redirect && <Redirect to="/"/>}
            <Dialog
                open={open}
                TransitionComponent={Transition}
                keepMounted
                aria-labelledby="alert-dialog-slide-title"
                aria-describedby="alert-dialog-slide-description">
                <DialogTitle id="alert-dialog-slide-title">Необходимо авторизоваться</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-slide-description">
                        Кажется, действие сессии {sessionName} истекло. Необходимо повторно авторизоваться.
                    </DialogContentText>
                </DialogContent>
                <DialogActions style={{display: 'flex', justifyContent: 'space-around'}}>
                    <Button onClick={handleOk} color="primary">Ок</Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}

interface Props {
    open: boolean;
    sessionName: string;
    brsAuth: BrsAuth;
}

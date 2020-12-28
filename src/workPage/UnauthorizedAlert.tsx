import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import {TransitionProps} from '@material-ui/core/transitions';
import {Redirect} from 'react-router-dom';
import * as cache from "../helpers/cache";

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export default function UnauthorizedAlert(props: { open: boolean }) {
    const {open} = props;

    const [redirect, setRedirect] = React.useState(false);

    const handleOk = () => {
        cache.clear('loginInfo');
        setRedirect(true);
    };

    return (
        <React.Fragment>
            {redirect && <Redirect to="/brs-extensions"/>}
            <Dialog
                open={open}
                TransitionComponent={Transition}
                keepMounted
                aria-labelledby="alert-dialog-slide-title"
                aria-describedby="alert-dialog-slide-description">
                <DialogTitle id="alert-dialog-slide-title">Необходимо авторизоваться</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-slide-description">
                        Кажется, действие сессии БРС или Google истекло. Необходимо повторно авторизоваться.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleOk} color="primary">Ок</Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}

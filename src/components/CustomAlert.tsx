import React from "react";
import MuiAlert, {AlertProps} from '@material-ui/lab/Alert';
import {Snackbar} from "@material-ui/core";

export default function CustomAlert(props: Props) {
    const {open, message, type, onClose} = props;

    return (
        <React.Fragment>
            <Snackbar
                open={open}
                autoHideDuration={10000}
                anchorOrigin={{vertical: 'top', horizontal: 'center'}}
                onClose={onClose}>
                <Alert severity={type} onClose={onClose}>
                    {message}
                </Alert>
            </Snackbar>
        </React.Fragment>
    );
}

function Alert(props: AlertProps) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

interface Props {
    open: boolean;
    message: string;
    type: "error" | "success";
    onClose: () => void;
}

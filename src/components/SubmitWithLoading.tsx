import Button from "@material-ui/core/Button";
import {CircularProgress} from "@material-ui/core";
import React from "react";
import "./submitWithLoading.css";

export default function SubmitWithLoading(props: Props) {
    const {title, loading, className, onClick, disabled = false} = props;

    return (
        <div className={"submit-with-loading " + className}>
            <Button type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={onClick}
                    disabled={loading || disabled}>
                {title}
            </Button>
            {
                loading &&
                <CircularProgress color="secondary" size={24} className="button-progress"/>
            }
        </div>
    )
}

interface Props {
    title: string;
    loading: boolean;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
}

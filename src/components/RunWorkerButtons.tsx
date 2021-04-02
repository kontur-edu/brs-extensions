import {Button, Collapse, Grid} from "@material-ui/core";
import React from "react";

export default function ({show, onRunWorkSafe, onRunWorkUnsafe}: Props) {
    return (
        <Collapse in={show} className={"vertical-margin-medium"}>
            <Grid container justify="space-around">
                <Grid item>
                    <Button variant="contained"
                            onClick={onRunWorkSafe}
                            color="primary">
                        Попробуй сделать хорошо
                    </Button>
                </Grid>
                <Grid item>
                    <Button variant="contained"
                            onClick={onRunWorkUnsafe}
                            color="secondary">
                        Сделай хорошо
                    </Button>
                </Grid>
            </Grid>
        </Collapse>
    );
}

interface Props {
    show: boolean;
    onRunWorkSafe: () => void;
    onRunWorkUnsafe: () => void;
}

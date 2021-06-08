import { Button, Grid } from "@material-ui/core";
import React from "react";

export default function RunWorkerButtons({
  enabled,
  onRunWorkSafe,
  onRunWorkUnsafe,
}: Props) {
  return (
    <Grid container justify="space-around">
      <Grid item>
        <Button
          variant="contained"
          disabled={!enabled}
          onClick={onRunWorkSafe}
          color="primary"
        >
          Попробовать сделать хорошо
        </Button>
      </Grid>
      <Grid item>
        <Button
          variant="contained"
          disabled={!enabled}
          onClick={onRunWorkUnsafe}
          color="secondary"
        >
          Сделать хорошо
        </Button>
      </Grid>
    </Grid>
  );
}

interface Props {
  enabled: boolean;
  onRunWorkSafe: () => void;
  onRunWorkUnsafe: () => void;
}

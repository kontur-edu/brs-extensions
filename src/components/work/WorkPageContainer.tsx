import React from "react";
import Context from "../../Context";
import WorkPage from "./WorkPage";

export default function WorkPageContainer() {
  return (
    <Context.Consumer>
      {(context) =>
        context && (
          <WorkPage
            brsAuth={context.brsAuth}
            brsApi={context.brsApi}
            googleAuth={context.googleAuth}
          />
        )
      }
    </Context.Consumer>
  );
}

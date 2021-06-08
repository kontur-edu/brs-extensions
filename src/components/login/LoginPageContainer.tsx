import React from "react";
import Context from "../../Context";
import LoginPage from "./LoginPage";

export default function LoginPageContainer() {
  return (
    <Context.Consumer>
      {(context) =>
        context && (
          <LoginPage
            brsAuth={context.brsAuth}
            googleAuth={context.googleAuth}
          />
        )
      }
    </Context.Consumer>
  );
}

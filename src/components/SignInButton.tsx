import Button from "payload/dist/admin/components/elements/Button";
import React from "react";
import { SIGN_IN_PATH } from "../config";

export default function SignInButton() {
  return (
    <div style={{ width: "100%" }}>
      <Button style={{ width: "100%" }} el="anchor" url={SIGN_IN_PATH}>
        Sign in with your identity
      </Button>
    </div>
  );
}

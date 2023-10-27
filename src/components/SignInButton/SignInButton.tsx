import Button from 'payload/dist/admin/components/elements/Button';
import React from 'react';

export default function SignInButton() {
  return (
    <div style={{ width: '100%', textAlign: 'center' }}>
      <h4 style={{ marginBottom: 0 }}>Deliverback Content</h4>

      <Button className="SignInButton" el="anchor" url="/oidc/signin">
        Sign in with your identity
      </Button>
    </div>
  );
}

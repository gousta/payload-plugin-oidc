import Button from 'payload/dist/admin/components/elements/Button';
import React from 'react';

export default function SignInButton() {
  let signInUrl = '/oidc/signin';

  try {
    const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
    if (redirectUrl) {
      signInUrl = `${signInUrl}?redirect=${redirectUrl}`;
    }
  } catch (e) {
    console.error('Failed to read `redirect` query parameter from the url', e);
  }

  return (
    <div style={{ width: '100%', textAlign: 'center' }}>
      <h4 style={{ marginBottom: 0 }}>Deliverback Content</h4>

      <Button className="SignInButton" el="anchor" url={signInUrl}>
        Sign in with your identity
      </Button>
    </div>
  );
}

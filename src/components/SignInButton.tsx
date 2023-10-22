import Button from 'payload/dist/admin/components/elements/Button'
import React from 'react'
import { SIGN_IN_PATH } from '../config'

export default function SignInButton() {
  return (
    <div style={{ marginBottom: 40 }}>
      <Button el="anchor" url={SIGN_IN_PATH}>
        Sign in with your identity
      </Button>
    </div>
  )
}

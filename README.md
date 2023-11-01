# OIDC plugin for Payload CMS

<a href="LICENSE">
  <img src="https://img.shields.io/badge/license-MIT-brightgreen.svg" alt="Software License" />
</a>
<a href="https://github.com/gousta/payload-plugin-oidc/issues">
  <img src="https://img.shields.io/github/issues/gousta/payload-plugin-oidc.svg" alt="Issues" />
</a>
<a href="https://npmjs.org/package/payload-plugin-oidc">
  <img src="https://img.shields.io/npm/v/payload-plugin-oidc.svg?style=flat-squar" alt="NPM" />
</a>

## Features

- Adds ability to sign in with your own OIDC provider
- Adds sign in button on login page
- Supports sign in and optional creation of user

## Installation

```
npm install payload-plugin-oidc
# or
yarn add payload-plugin-oidc
```

## Usage

```js
// payload.config.ts
import { oidcPlugin } from 'payload-plugin-oidc';

export default buildConfig({
  serverURL: process.env.SERVER_URL,
  collections: [Users],
  plugins: [
    oidcPlugin({
      clientID: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      authorizationURL: `${process.env.OIDC_URI}/oidc/auth`,
      tokenURL: `${process.env.OIDC_URI}/oidc/token`,
      initPath: `/oidc/signin`,
      callbackPath: `/oidc/callback`,
      callbackURL: `${process.env.SELF_URL}/oidc/callback`,
      scope: 'openid offline_access profile email custom_data',
      mongoUrl: process.env.DATABASE_URI,
      userCollection: {
        slug: Users.slug,
        searchKey: 'email',
      },
      registerUserIfNotFound: true,
      async userinfo(accessToken) {
        const { data: user } = await axios.get(`${process.env.OIDC_URI}/oidc/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        return {
          sub: user.sub,
          name: user.name,
          email: user.email,
          // You can use OIDC user custom data to get the role for this app
          role: user.custom_data?.my_app_role,

          // or you can do something like this
          // role: user.custom_data?.role ? 'admin' : 'editor',
        };
      },
    }),
  ],
});
```

## Contributing

Contributions and feedback are very welcome.

To get it running:

1. Clone the project.
2. `npm install`
3. `npm run build`

## License

The MIT License (MIT). Please see [License File](LICENSE) for more information.

[link-contributors]: ../../contributors

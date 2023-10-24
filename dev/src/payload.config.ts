import { buildConfig } from "payload/config";
import path from "path";
import Users from "./collections/Users";
import Examples from "./collections/Examples";
import { oidcPlugin } from "../../src/index";
import axios from "axios";

export default buildConfig({
  serverURL: "http://localhost:3000",
  admin: {
    user: Users.slug,
    webpack: (config) => {
      const newConfig = {
        ...config,
        resolve: {
          ...config.resolve,
          alias: {
            ...(config?.resolve?.alias || {}),
            react: path.join(__dirname, "../node_modules/react"),
            "react-dom": path.join(__dirname, "../node_modules/react-dom"),
            payload: path.join(__dirname, "../node_modules/payload"),
          },
        },
      };
      return newConfig;
    },
  },
  collections: [Examples, Users],
  typescript: {
    outputFile: path.resolve(__dirname, "payload-types.ts"),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, "generated-schema.graphql"),
  },
  plugins: [
    oidcPlugin({
      enabled: true,
      clientID: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      authorizationURL: `${process.env.OIDC_URI}/oidc/auth`,
      tokenURL: `${process.env.OIDC_URI}/oidc/token`,
      initPath: `/oidc/signin`,
      callbackPath: `/oidc/callback`,
      scope: "openid offline_access profile email custom_data",
      mongoUrl: process.env.DATABASE_URI,
      subField: { name: "email" },
      allowRegistration: true,
      // components: {
      //   Button: SignInButton,
      // },
      async userinfo(accessToken) {
        const { data: user } = await axios.get(
          `${process.env.OIDC_URI}/oidc/me`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        return {
          sub: user.sub,
          name: user.name,
          email: user.email,
          role: "admin",
        };
      },
    }),
  ],
});

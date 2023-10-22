import { Config } from "payload/config";

export const webpackOverride = (incoming: Config) => (webpackConfig: any) => {
  const config = incoming.admin?.webpack?.(webpackConfig) || webpackConfig;

  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        "connect-mongo": false,
        "express-session": false,
        "passport-oauth2": false,
        jsonwebtoken: false,
        passport: false,
      },
    },
  };
};

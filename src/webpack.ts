import path from "path";
import type { Config } from "payload/config";
import type { Configuration as WebpackConfig } from "webpack";

export const extendWebpackConfig =
  (config: Config): ((webpackConfig: WebpackConfig) => WebpackConfig) =>
  (webpackConfig) => {
    const existingWebpackConfig =
      typeof config.admin?.webpack === "function"
        ? config.admin.webpack(webpackConfig)
        : webpackConfig;

    const mockModulePath = path.resolve(__dirname, "./mocks/mockFile.js");

    const newWebpack = {
      ...existingWebpackConfig,
      resolve: {
        ...(existingWebpackConfig.resolve || {}),
        alias: {
          ...(existingWebpackConfig.resolve?.alias
            ? existingWebpackConfig.resolve.alias
            : {}),
          // Add additional aliases here like so:
          [path.resolve(__dirname, "./connect-mongo")]: mockModulePath,
          [path.resolve(__dirname, "./express-session")]: mockModulePath,
          [path.resolve(__dirname, "./passport-oauth2")]: mockModulePath,
          [path.resolve(__dirname, "./jsonwebtoken")]: mockModulePath,
          [path.resolve(__dirname, "./passport")]: mockModulePath,
        },
      },
    };

    return newWebpack;
  };

// alias:
// "connect-mongo": false,
// "express-session": false,
// "passport-oauth2": false,
// jsonwebtoken: false,
// passport: false,

import type { Config } from "payload/config";
import type { Configuration as WebpackConfig } from "webpack";

export const extendWebpackConfig =
  (config: Config): ((webpackConfig: WebpackConfig) => WebpackConfig) =>
  (webpackConfig) => {
    const existingWebpackConfig =
      typeof config.admin?.webpack === "function"
        ? config.admin.webpack(webpackConfig)
        : webpackConfig;

    // const mockModulePath = path.resolve(__dirname, "./mocks/mockFile.js");

    const newWebpack: WebpackConfig = {
      ...existingWebpackConfig,
      resolve: {
        ...(existingWebpackConfig.resolve || {}),
        alias: {
          ...(existingWebpackConfig.resolve?.alias
            ? existingWebpackConfig.resolve.alias
            : {}),
          // Add additional aliases here like so:
          // [path.resolve(__dirname, "./package")]: mockModulePath,
          "connect-mongo": false,
          "express-session": false,
          "passport-oauth2": false,
          jsonwebtoken: false,
          passport: false,
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

import type { Config } from 'payload/config';
import type { Configuration as WebpackConfig } from 'webpack';

export const extendWebpackConfig =
  (config: Config): ((webpackConfig: WebpackConfig) => WebpackConfig) =>
  (webpackConfig: any) => {
    const existingWebpackConfig =
      typeof config.admin?.webpack === 'function'
        ? config.admin.webpack(webpackConfig)
        : webpackConfig;

    const newWebpack = {
      ...existingWebpackConfig,
      resolve: {
        ...(existingWebpackConfig.resolve || {}),
        alias: {
          ...(existingWebpackConfig.resolve?.alias ? existingWebpackConfig.resolve.alias : {}),

          'express-session': false,
          'passport-oauth2': false,
          memorystore: false,
          jsonwebtoken: false,
          passport: false,
        },
      },
    };

    return newWebpack;
  };

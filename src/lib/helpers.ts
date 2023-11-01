import { oidcPluginOptions } from "../types";

export const getCallbackPath = (opts: oidcPluginOptions) => {
  return (
    opts.callbackPath ||
    (opts.callbackURL && new URL(opts.callbackURL).pathname) ||
    '/oidc/callback'
  );
};

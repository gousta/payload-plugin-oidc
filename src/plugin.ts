import MongoStore from 'connect-mongo';
import session from 'express-session';
import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';
import payload from 'payload';
import type { Config } from 'payload/config';
import SignInButton from './components/SignInButton/SignInButton';
import { loginHandler } from './lib/login';
import type { oidcPluginOptions } from './types';
import { verify } from './lib/oauth/verify';
import { extendWebpackConfig } from './lib/webpack';

// Detect client side because some dependencies may be nullified
const isUI = typeof session !== 'function';

export const oidcPlugin =
  (opts: oidcPluginOptions) =>
  (incomingConfig: Config): Config => {
    let config = { ...incomingConfig };

    config.admin = {
      ...(config.admin || {}),

      webpack: extendWebpackConfig(incomingConfig),
      components: {
        ...(config.admin?.components || {}),
        beforeLogin: [
          ...(config.admin?.components?.beforeLogin || []),
          opts.components?.Button ?? SignInButton,
        ],
      },
    };

    if (isUI) return config;
    // If the plugin is disabled, return the config without modifying it
    // The order of this check is important, we still want any webpack extensions to be applied even if the plugin is disabled
    if (opts.enabled === false) return config;

    const userCollectionSlug = (opts.userCollection?.slug as 'users') || 'users';
    const callbackPath = getCallbackPath(opts);
    const store = MongoStore.create({ mongoUrl: opts.mongoUrl, collectionName: 'oidc_sessions' });

    config.endpoints = [
      ...(config.endpoints || []),
      {
        path: opts.initPath,
        method: 'get',
        root: true,
        handler: passport.authenticate('oauth2'),
      },
      {
        path: callbackPath,
        method: 'get',
        root: true,
        handler: session({
          resave: false,
          saveUninitialized: false,
          secret: process.env.PAYLOAD_SECRET || 'unsafe',
          store,
        }),
      },
      {
        path: callbackPath,
        method: 'get',
        root: true,
        handler: passport.authenticate('oauth2', { failureRedirect: '/' }),
      },
      {
        path: callbackPath,
        method: 'get',
        root: true,
        handler: loginHandler(userCollectionSlug),
      },
    ];

    passport.use(new OAuth2Strategy(opts, verify(opts)));
    passport.serializeUser((user: any, done) => done(null, user.id));
    passport.deserializeUser(async (id: string, done) => {
      const user = await payload.findByID({
        collection: userCollectionSlug,
        id,
      });
      done(null, user);
    });

    return config;
  };

const getCallbackPath = (opts: oidcPluginOptions) => {
  return (
    opts.callbackPath ||
    (opts.callbackURL && new URL(opts.callbackURL).pathname) ||
    '/oidc/callback'
  );
};

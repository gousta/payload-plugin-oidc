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
import { getCallbackPath } from './lib/helpers';
import createMemoryStore from 'memorystore';

// Detect client side because some dependencies may be nullified
const isUI = typeof session !== 'function';

export const oidcPlugin =
  (opts: oidcPluginOptions) =>
  (incomingConfig: Config): Config => {
    let config = { ...incomingConfig };
    const buttonComponentPosition = opts.components?.position ?? 'beforeLogin';
    let componentConfigs = config.admin?.components?.beforeLogin || [];

    if (buttonComponentPosition == 'afterLogin') {
      componentConfigs = config.admin?.components?.afterLogin || [];
    }

    config.admin = {
      ...(config.admin || {}),

      webpack: extendWebpackConfig(incomingConfig),
      components: {
        ...(config.admin?.components || {}),
        [buttonComponentPosition]: [
          ...(componentConfigs || []),
          opts.components?.Button ?? SignInButton,
        ],
      },
    };

    if (isUI) return config;

    const userCollectionSlug = (opts.userCollection?.slug as 'users') || 'users';
    const callbackPath = getCallbackPath(opts);
    const MemoryStore = createMemoryStore(session);

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
          store: new MemoryStore({
            checkPeriod: 86400000, // prune expired entries every 24h
          }),
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
        handler: loginHandler(userCollectionSlug, opts.redirectPathAfterLogin || '/admin'),
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

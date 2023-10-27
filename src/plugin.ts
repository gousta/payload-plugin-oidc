import session from 'express-session';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';
import payload from 'payload';
import type { Config } from 'payload/config';
import { Field, fieldAffectsData, fieldHasSubFields } from 'payload/dist/fields/config/types';
import getCookieExpiration from 'payload/dist/utilities/getCookieExpiration';
import type { oidcPluginOptions } from './types';
import { verify } from './verify';
import { extendWebpackConfig } from './webpack';
import { SanitizedCollectionConfig } from 'payload/types';
import SignInButton from './components/SignInButton/SignInButton';

// Detect client side because some dependencies may be nullified
const CLIENTSIDE = typeof session !== 'function';

export const oidcPlugin =
  (opts: oidcPluginOptions) =>
  (incomingConfig: Config): Config => {
    let config = { ...incomingConfig };

    const userCollectionSlug = (opts.userCollection?.slug as 'users') || 'users';

    const callbackPath =
      opts.callbackPath ||
      (opts.callbackURL && new URL(opts.callbackURL).pathname) ||
      '/oidc/callback';

    // If you need to add a webpack alias, use this function to extend the webpack config
    const webpack = extendWebpackConfig(incomingConfig);

    config.admin = {
      ...(config.admin || {}),
      // If you extended the webpack config, add it back in here
      // If you did not extend the webpack config, you can remove this line
      webpack,
      components: {
        ...(config.admin?.components || {}),
        beforeLogin: [
          ...(config.admin?.components?.beforeLogin || []),
          opts.components?.Button ?? SignInButton,
        ],
      },
    };

    if (CLIENTSIDE) {
      return config;
    }

    // If the plugin is disabled, return the config without modifying it
    // The order of this check is important, we still want any webpack extensions to be applied even if the plugin is disabled
    if (opts.enabled === false) {
      return config;
    }

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
        async handler(req, res) {
          // Get the Mongoose user
          const collectionConfig = payload.collections[userCollectionSlug].config;

          // Sanitize the user object
          // let user = userDoc.toJSON({ virtuals: true })
          let user = JSON.parse(JSON.stringify(req.user));

          // Decide which user fields to include in the JWT
          const fieldsToSign = getFieldsToSign(collectionConfig, user);

          // Sign the JWT
          const token = jwt.sign(fieldsToSign, payload.secret, {
            expiresIn: collectionConfig.auth.tokenExpiration,
          });

          // Set cookie
          res.cookie(`${payload.config.cookiePrefix}-token`, token, {
            path: '/',
            httpOnly: true,
            expires: getCookieExpiration(collectionConfig.auth.tokenExpiration),
            secure: collectionConfig.auth.cookies.secure,
            sameSite: collectionConfig.auth.cookies.sameSite,
            domain: collectionConfig.auth.cookies.domain || undefined,
          });

          // Redirect to admin dashboard
          res.redirect('/admin');
        },
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

const getFieldsToSign = (collectionConfig: SanitizedCollectionConfig, user: any) => {
  return collectionConfig.fields.reduce(
    (signedFields, field: Field) => {
      const result = {
        ...signedFields,
      };

      if (!fieldAffectsData(field) && fieldHasSubFields(field)) {
        field.fields.forEach((subField) => {
          if (fieldAffectsData(subField) && subField.saveToJWT) {
            result[subField.name] = user[subField.name];
          }
        });
      }

      if (fieldAffectsData(field) && field.saveToJWT) {
        result[field.name] = user[field.name];
      }

      return result;
    },
    {
      email: user.email,
      id: user.id,
      collection: collectionConfig.slug,
    } as any,
  );
};

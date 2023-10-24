import { str62 } from "@bothrs/util/random";
import MongoStore from "connect-mongo";
import debug from "debug";
import session from "express-session";
import jwt from "jsonwebtoken";
import passport from "passport";
import OAuth2Strategy, { VerifyCallback } from "passport-oauth2";
import payload from "payload";
import { Config } from "payload/config";
import {
  Field,
  fieldAffectsData,
  fieldHasSubFields,
} from "payload/dist/fields/config/types";
import getCookieExpiration from "payload/dist/utilities/getCookieExpiration";
import { TextField } from "payload/types";

import { PaginatedDocs } from "payload/dist/database/types";
import SignInButton from "./components/SignInButton";
import { webpackOverride } from "./overrides";
import type { oidcPluginOptions } from "./types";

export { SignInButton, oidcPluginOptions };

interface User {
  id: string | number;
  email?: string;
}

const log = debug("plugin:oidc");

// Detect client side because some dependencies may be nullified
const CLIENTSIDE = typeof session !== "function";

export const oidcPlugin =
  (options: oidcPluginOptions) =>
  (incoming: Config): Config => {
    // Shorthands
    const collectionSlug = options.userCollection?.slug || "users";
    const sub = options.subField?.name || "sub";

    // Spread the existing config
    const config: Config = {
      ...incoming,
      collections: (incoming.collections || []).map((c) => {
        if (
          c.slug === collectionSlug &&
          !c.fields.some((f) => (f as TextField).name === sub)
        ) {
          c.fields.push({
            name: sub,
            type: "text",
            admin: { readOnly: true },
            access: { update: () => false },
          });
        }
        return c;
      }),
    };

    return CLIENTSIDE
      ? oidcPluginClient(config, options)
      : oidcPluginServer(config, options);
  };

function oidcPluginClient(
  incoming: Config,
  options: oidcPluginOptions
): Config {
  const button: React.ComponentType<any> =
    options.components?.Button || SignInButton;
  return {
    ...incoming,
    admin: {
      ...incoming.admin,
      components: {
        ...incoming.admin?.components,
        beforeLogin: (incoming.admin?.components?.beforeLogin || []).concat(
          button
        ),
      },
    },
  };
}

function oidcPluginServer(
  incoming: Config,
  options: oidcPluginOptions
): Config {
  if (!options.clientID) {
    throw new Error("oidcPlugin requires options.clientID");
  }

  const userCollectionSlug =
    (options.userCollection?.slug as "users") || "users";

  const strategy = new OAuth2Strategy(
    options,
    verification(options, userCollectionSlug)
  );

  passport.use(strategy);
  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    const user = await payload.findByID({ collection: userCollectionSlug, id });
    done(null, user);
  });

  const callbackPath =
    options.callbackPath ||
    (options.callbackURL && new URL(options.callbackURL).pathname) ||
    "/oidc/callback";

  return {
    ...incoming,
    endpoints: (incoming.endpoints || []).concat([
      {
        path: options.initPath,
        method: "get",
        root: true,
        handler: passport.authenticate("oauth2"),
      },
      {
        path: callbackPath,
        method: "get",
        root: true,
        handler: session({
          resave: false,
          saveUninitialized: false,
          secret:
            process.env.PAYLOAD_SECRET ||
            log("Missing process.env.PAYLOAD_SECRET") ||
            "unsafe",
          store: options.mongoUrl
            ? MongoStore.create({ mongoUrl: options.mongoUrl })
            : undefined,
        }),
      },
      {
        path: callbackPath,
        method: "get",
        root: true,
        handler: passport.authenticate("oauth2", { failureRedirect: "/" }),
      },
      {
        path: callbackPath,
        method: "get",
        root: true,
        async handler(req, res) {
          // Get the Mongoose user
          const collectionConfig =
            payload.collections[userCollectionSlug].config;

          // Sanitize the user object
          // let user = userDoc.toJSON({ virtuals: true })
          let user = JSON.parse(JSON.stringify(req.user));

          // Decide which user fields to include in the JWT
          const fieldsToSign = collectionConfig.fields.reduce(
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
            } as any
          );

          // Sign the JWT
          const token = jwt.sign(fieldsToSign, payload.secret, {
            expiresIn: collectionConfig.auth.tokenExpiration,
          });

          // Set cookie
          res.cookie(`${payload.config.cookiePrefix}-token`, token, {
            path: "/",
            httpOnly: true,
            expires: getCookieExpiration(collectionConfig.auth.tokenExpiration),
            secure: collectionConfig.auth.cookies.secure,
            sameSite: collectionConfig.auth.cookies.sameSite,
            domain: collectionConfig.auth.cookies.domain || undefined,
          });

          // Redirect to admin dashboard
          res.redirect("/admin");
        },
      },
    ]),
  };
}

const verification = (options: oidcPluginOptions, userCollectionSlug: string) =>
  async function (
    accessToken: string,
    refreshToken: string,
    profile: {},
    cb: VerifyCallback
  ) {
    const allowRegistration = options.allowRegistration || false;
    const searchKey = options.subField?.name || "sub";
    let info: {
      sub: string;
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    };
    let user: User & { collection?: any; _strategy?: any };
    let users: PaginatedDocs<User>;

    try {
      // Get the userinfo
      info = await options.userinfo?.(accessToken);
      if (!info) throw new Error("Failed to get userinfo");

      // Match existing user
      users = await payload.find({
        collection: userCollectionSlug,
        where: { [searchKey]: { equals: info[searchKey as "sub"] } },
        showHiddenFields: true,
      });

      log(
        "signin.debug",
        `users lookup with ${searchKey} returned ${users.docs.length} results`
      );

      if (users.docs && users.docs.length) {
        user = users.docs[0];
        log("signin.debug", `selecting user with ${searchKey} ${user.email}`);

        await payload.update({
          collection: userCollectionSlug,
          where: { [searchKey]: { equals: info[searchKey as "sub"] } },
          data: {
            sub: info.sub,
            role: info.role,
          },
        });
        log("signin.debug", `updated user with ${searchKey} ${user.email}`);

        users = await payload.find({
          collection: userCollectionSlug,
          where: { [searchKey]: { equals: info[searchKey as "sub"] } },
          showHiddenFields: true,
        });
        user = users.docs[0];
        user.collection = userCollectionSlug;
        user._strategy = "oauth2";
        log("signin.user", user);
        cb(null, user);
      } else {
        if (allowRegistration) {
          log("signin.debug", "allow registrations, so registering");
          // Register new user
          user = await payload.create({
            collection: userCollectionSlug,
            data: {
              ...info,
              // Stuff breaks when password is missing
              password: info.password || str62(20),
            },
            showHiddenFields: true,
          });
          user.collection = userCollectionSlug;
          user._strategy = "oauth2";
          log("signin.user", user);
          cb(null, user);
        } else {
          log("signin.debug", "does not allow registrations, so failing");
          log("signin.fail", "account does not exist");
          cb(new Error("Account does not exist"));
        }
      }
    } catch (error: any) {
      log("signin.fail", error.message, error.trace);
      cb(error);
    }
  };

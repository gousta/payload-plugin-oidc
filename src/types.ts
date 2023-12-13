import type { StrategyOptions } from 'passport-oauth2';
import type { ComponentType } from 'react';

export const _strategy = 'oauth2';

export interface oidcPluginOptions extends StrategyOptions {
  /** How to connect to the Mongo database? */
  mongoUrl: string;

  /** Register user after successful authentication (when user not found) - Defaults to false */
  createUserIfNotFound: boolean;

  /** Map an authentication result to a user */
  userinfo: (accessToken: string) => Promise<{
    /** Unique identifier for the linked account */
    sub: string;
    /** Unique identifier for the linked account */
    email?: string;
    /** A password will be generated for new users */
    password?: string;
    /** Example of a custom field */
    name?: string;
  }>;

  /** Which path to mount for the initialization endpoint in express */
  initPath: string;

  /** Which path to mount for the callback endpoint in express, defaults to the path in callbackURL */
  callbackPath?: string;

  /** Override button component */
  components?: {
    Button?: ComponentType<any>;
    position?: 'beforeLogin' | 'afterLogin';
  };

  userCollection?: {
    /** Defaults to "users" */
    slug?: string;
    /** Defaults to "sub" */
    searchKey?: string;
  };
}

export interface OIDCUser {
  id: string | number;
  email?: string;
}

export interface UserInfo {
  sub: string;
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}

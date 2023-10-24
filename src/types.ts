import type { StrategyOptions } from "passport-oauth2";
import type { ComponentType } from "react";

export interface oidcPluginOptions extends StrategyOptions {
  /**
   * Enable or disable plugin
   * @default false
   */
  enabled?: boolean;

  /** How to connect to the Mongo database? */
  mongoUrl: string;

  /** Register user after successful authentication (when user not found) - Defaults to false */
  allowRegistration: boolean;

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

  components?: {
    Button?: ComponentType<any>;
  };

  userCollection?: {
    /** Defaults to "users" */
    slug?: string;
  };

  /** If the collection does not have a field with name "sub", it will be created */
  subField?: {
    /** Defaults to "sub" */
    name?: string;
  };
}

export interface OIDCUser {
  id: string | number;
  email?: string;
}

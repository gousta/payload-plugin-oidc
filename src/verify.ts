import { VerifyCallback } from "passport-oauth2";
import payload from "payload";
import { PaginatedDocs } from "payload/dist/database/types";
import { oidcPluginOptions, OIDCUser } from "./types";

export const verify = (
  options: oidcPluginOptions,
  userCollectionSlug: string
) =>
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
    let user: OIDCUser & { collection?: any; _strategy?: any };
    let users: PaginatedDocs<OIDCUser>;

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

      if (users.docs && users.docs.length) {
        user = users.docs[0];

        await payload.update({
          collection: userCollectionSlug,
          where: { [searchKey]: { equals: info[searchKey as "sub"] } },
          data: {
            sub: info.sub,
            role: info.role,
          },
        });

        users = await payload.find({
          collection: userCollectionSlug,
          where: { [searchKey]: { equals: info[searchKey as "sub"] } },
          showHiddenFields: true,
        });
        user = users.docs[0];
        user.collection = userCollectionSlug;
        user._strategy = "oauth2";

        cb(null, user);
      } else {
        if (allowRegistration) {
          // Register new user
          user = await payload.create({
            collection: userCollectionSlug,
            data: {
              ...info,
              // Stuff breaks when password is missing
              password: info.password || makeid(20),
            },
            showHiddenFields: true,
          });
          user.collection = userCollectionSlug;
          user._strategy = "oauth2";

          cb(null, user);
        } else {
          cb(new Error("Account does not exist"));
        }
      }
    } catch (error: any) {
      cb(error);
    }
  };

function makeid(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

import { VerifyCallback } from 'passport-oauth2';
import payload from 'payload';
import { oidcPluginOptions, UserInfo, _strategy } from './types';

export const verify = (options: oidcPluginOptions) =>
  async function (accessToken: string, refreshToken: string, profile: {}, cb: VerifyCallback) {
    const collection = options.userCollection?.slug ?? ('users' as any);
    const searchKey = options.userCollection?.searchKey ?? ('sub' as any);
    const registerUserIfNotFound = options.registerUserIfNotFound || false;

    try {
      const info = await options.userinfo?.(accessToken);
      if (!info) cb(new Error('FAILED TO GET USERINFO'));

      const user = await findUser(collection, searchKey, info);

      if (user) {
        await updateUser(collection, searchKey, info);
        const updatedUser = await findUser(collection, searchKey, info);

        return cb(null, { ...updatedUser, collection, _strategy });
      }

      if (registerUserIfNotFound) {
        const newUser = await createUser(collection, info);

        return cb(null, { ...newUser, collection, _strategy });
      } else {
        return cb(new Error('USER DOES NOT EXIST'));
      }
    } catch (error: any) {
      console.error('VERIFICATION FAILED', error);
      return cb(error);
    }
  };

const findUser = async (collection: any, searchKey: string, info: UserInfo) => {
  const where = { [searchKey]: { equals: info[searchKey as 'sub'] } };
  try {
    const users = await payload.find({
      collection,
      where,
    });

    if (!users.docs || !users.docs[0]) return null;

    return users.docs && users.docs[0];
  } catch (e) {
    console.error('findUserBySearchKey has caused an error:', {
      e,
      collection,
      searchKey,
      info,
    });
    throw new Error(e);
  }
};

const updateUser = async (collection: any, searchKey: string, info: UserInfo) => {
  return await payload.update({
    collection,
    where: { [searchKey]: { equals: info[searchKey as 'sub'] } },
    data: { ...info },
  });
};

const createUser = async (collection: any, info: UserInfo) => {
  return await payload.create({
    collection,
    data: {
      ...info,
      // Stuff breaks when password is missing
      password: info?.password || makeid(20),
    },
  });
};

const makeid = (length: number) => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};

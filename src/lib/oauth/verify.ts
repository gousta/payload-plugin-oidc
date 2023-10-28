import { VerifyCallback } from 'passport-oauth2';
import payload from 'payload';
import { oidcPluginOptions, UserInfo, _strategy } from '../../types';

const ERROR_USERINFO = new Error('FAILED TO GET USERINFO');
const ERROR_USER_DOES_NOT_EXIST = new Error('USER DOES NOT EXIST');

export const verify = (opts: oidcPluginOptions) =>
  async function (accessToken: string, refreshToken: string, profile: {}, cb: VerifyCallback) {
    const collection = opts.userCollection?.slug ?? ('users' as any);
    const searchKey = opts.userCollection?.searchKey ?? ('sub' as any);
    const createUserIfNotFound = opts.createUserIfNotFound || false;

    try {
      const info = await opts.userinfo?.(accessToken);
      if (!info) cb(ERROR_USERINFO);

      const user = await findUser(collection, searchKey, info);

      if (user) {
        await updateUser(collection, searchKey, info);
        const updatedUser = await findUser(collection, searchKey, info);

        return cb(null, { ...updatedUser, collection, _strategy });
      }

      if (createUserIfNotFound) {
        const newUser = await createUser(collection, info);

        return cb(null, { ...newUser, collection, _strategy });
      } else {
        return cb(ERROR_USER_DOES_NOT_EXIST);
      }
    } catch (error: any) {
      return cb(error);
    }
  };

const findUser = async (collection: any, searchKey: string, info: UserInfo) => {
  const where = { [searchKey]: { equals: info[searchKey as 'sub'] } };
  const users = await payload.find({
    collection,
    where,
  });

  if (!users.docs || !users.docs[0]) return null;

  return users.docs && users.docs[0];
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
    data: { ...info, password: info?.password || makeid(20) },
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

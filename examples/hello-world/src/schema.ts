import {
  stringArg,
  makeSchema,
  mutationType,
  objectType,
  intArg,
  queryType,
} from "nexus";
import { validatePlugin } from "nexus-validate-zod";
import { z } from "zod";

let USERS = [
  {
    name: "Test",
    email: "test@test.com",
    age: 30,
    website: "https://website.com",
  },
];

export const User = objectType({
  name: "User",
  definition(t) {
    t.string("name");
    t.string("email");
    t.int("age");
    t.string("website");
    t.string("secret");
    t.list.field("friends", {
      type: User,
      args: {
        email: stringArg(),
      },
      validate: ({ string }) => ({
        email: string().email(),
      }),
      resolve: (_, args) => {
        return USERS;
      },
    });
  },
});

const Mutation = mutationType({
  definition(t) {
    t.field("createUser", {
      type: "User",
      args: {
        name: stringArg(),
        email: stringArg(),
        age: intArg(),
        website: stringArg(),
        secret: stringArg(),
      },
      // this will get called before the resolver and we can use
      // the rules from the first argument together with args and context
      // to figure out if the provided arguments are valid or not
      validate: () => ({
        name: z.coerce.string(),
        email: z.coerce.string().email(),
        age: z.coerce.number().min(18),
        website: z.coerce.string().url(),
        // create a custom rule for secret that uses a custom test,
        // the provided argument and the graphql context
        secret: z.string(),
      }),
      resolve: (_, args) => {
        return {
          ...USERS[0],
          ...args,
        };
      },
    });
  },
});

const Query = queryType({
  definition(t) {
    t.field("user", {
      type: "User",
      args: {
        email: stringArg(),
      },
      validate: (args, ctx) => ({
        email: z.string().email(),
      }),
      resolve: (_, args) => {
        return {
          ...USERS[0],
          ...args,
        };
      },
    });
  },
});

export const schema = makeSchema({
  types: [User, Mutation, Query],
  contextType: {
    module: require.resolve("./context"),
    export: "Context",
  },
  outputs: {
    schema: __dirname + "/../schema.graphql",
    typegen: __dirname + "/generated/nexus.ts",
  },
  // add the plugin with a custom `formatError` function
  // that passed the error to apollos UserInputError
  plugins: [validatePlugin()],
});

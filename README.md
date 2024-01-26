# nexus-validate-zod

[![npm](https://img.shields.io/npm/v/nexus-validate-zod)](https://www.npmjs.com/package/nexus-validate-zod)
[![npm bundle size](https://img.shields.io/bundlephobia/min/nexus-validate)](https://bundlephobia.com/result?p=nexus-validate-zod)
![build-publish](https://github.com/filipstefansson/nexus-validate/workflows/build-publish/badge.svg)

Add extra validation to [GraphQL Nexus](https://github.com/graphql-nexus/nexus) in an easy and expressive way.

```ts
const UserMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('createUser', {
      type: 'User',

      // add arguments
      args: {
        email: stringArg(),
        age: intArg(),
      },

      // add the extra validation
      validate: {
        email: z.string().email(),
        age: z.number().min(18),
      },
    });
  },
});
```

## Documentation

- [Installation](#installation)
- [Usage](#usage)
  - [Custom validations](#custom-validations)
  - [Custom errors](#custom-errors)
  - [Custom error messages](#custom-error-messages)
- [API](#api)
- [Examples](#examples)

## Installation

```console
# npm
npm i nexus-validate-zod zod

# yarn
yarn add nexus-validate-zod zod

# pnpm
pnpm add nexus-validate-zod zod
```

> `nexus-validate-zod` uses [`zod`](https://zod.dev) under the hood so you need to install that too. `nexus` and `graphql` are also required, but if you are using Nexus then both of those should already be installed.

### Add the plugin to Nexus:

Once installed you need to add the plugin to your nexus schema configuration:

```ts
import { makeSchema } from 'nexus';
import { validatePlugin } from 'nexus-validate-zod';

const schema = makeSchema({
  ...
  plugins: [
    ...
    validatePlugin(),
  ],
});
```

## Usage

The `validate` method can be added to any field with `args`:

```ts
const UserMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('createUser', {
      type: 'User',
      args: {
        email: stringArg(),
      },
      validate: {
        // validate that email is an actual email
        email: z.string().email(),
      },
    });
  },
});
```

Trying to call the above with an invalid email will result in the following error:

```json
{
  "errors": [
    {
      "message": "Validation failed",
      "extensions": {
        "validationErrors": {
            "email": "Invalid email"
        },
        "code": "BAD_USER_INPUT"
      }
      ...
    }
  ]
}
```

### Custom validations

If you don't want to use the built-in validation rules, you can roll your own by **throwing an error if an argument is invalid**, and **returning void** if everything is OK.

```ts
import { UserInputError } from 'nexus-validate';
t.field('createUser', {
  type: 'User',
  args: {
    email: stringArg(),
  },
  // use args and context to check if email is valid
  validate(args, context) {
    if (args.email !== context.user.email) {
      throw new UserInputError('not your email', {
        invalidArgs: ['email'],
      });
    }
  },
});
```

### Custom errors

The plugin provides a `formatError` option where you can format the error however you'd like:

```ts
import { UserInputError } from 'apollo-server';
import { validatePlugin, ValidationError } from 'nexus-validate';

const schema = makeSchema({
  ...
  plugins: [
    ...
    validatePlugin({
      formatError: ({ error }) => {
        if (error instanceof ZodError) {
          // convert error to UserInputError from apollo-server
          return new UserInputError("Your custom error message", {
            validationErrors: { ... },
          });
        }

        return error;
      },
    }),
  ],
});
```

### Custom error messages

If you want to change the error message for the validation rules, that's usually possible by passing a message to the rule:

```ts
validate: {
  email: z
          .string({
            required_error: 'Email is required',
          })
          .email('Email must be valid email'),
};
```

## API

##### `validate(args: Args, ctx: Context) => Promise<ValidationSchema | boolean>`

### Args

The `Args` argument will return whatever you passed in to `args` in your field definition:

```ts
t.field('createUser', {
  type: 'User',
  args: {
    email: stringArg(),
    age: numberArg(),
  },
  // email and age will be typed as a string and a number
  validate: ({ email, age }) => {}
}
```

### Context

`Context` is your GraphQL context, which can give you access to things like the current user or your data sources. This will let you validation rules based on the context of your API.

```ts
t.field('createUser', {
  type: 'User',
  args: {
    email: stringArg(),
  },
  validate: async ({ email }, { prisma }) => {
    const count = await prisma.user.count({ where: { email } });
    if (count > 1) {
      throw new Error('email already taken');
    }
  },
});
```

## Examples

- [Hello World Example](examples/hello-world)

import {
  ArgsValue,
  CreateFieldResolverInfo,
  GetGen,
  MaybePromise,
  MiddlewareFn,
} from "nexus/dist/core";

import { ValidatePluginConfig } from "./index";
import { defaultFormatError } from "./error";
import { ZodError, ZodRawShape, ZodTypeAny, z } from "zod";

export type ValidationSchema<
  TypeName extends string,
  FieldName extends string,
> = {
  [K in keyof ArgsValue<TypeName, FieldName>]?: ZodTypeAny;
};

export type ValidateProps<TypeName extends string, FieldName extends string> =
  | ValidationSchema<TypeName, FieldName>
  | ((
      args: ArgsValue<TypeName, FieldName>,
      ctx: GetGen<"context">
    ) => MaybePromise<ValidationSchema<TypeName, FieldName> | void>);

export const resolver =
  (validateConfig: ValidatePluginConfig = {}) =>
  (config: CreateFieldResolverInfo): MiddlewareFn | undefined => {
    const { formatError = defaultFormatError } = validateConfig;

    const validate: ValidateProps<any, any> =
      config.fieldConfig.extensions?.nexus?.config.validate;

    // if the field doesn't have an validate field,
    // don't worry about wrapping the resolver
    if (validate == null) {
      return;
    }

    const args = config?.fieldConfig?.args ?? {};
    if (Object.keys(args).length === 0) {
      console.error(
        "\x1b[33m%s\x1b[0m",
        `[${config.parentTypeConfig.name}.${config.fieldConfig.name}] does not have any arguments, but a validate function was passed`
      );
    }

    if (typeof validate === "object") {
      if (Object.keys(validate).length === 0) {
        console.error(
          "\x1b[33m%s\x1b[0m",
          `[${config.parentTypeConfig.name}.${config.fieldConfig.name}] does not have any keys in zod object`
        );
      }

      Object.keys(validate).forEach((k) => {
        if (validate[k] === undefined) delete validate[k];
      });

      // if validate property is ZodObject, just parse raw args with it
      return (root, rawArgs, ctx, info, next) => {
        try {
          const args = z.object(validate as ZodRawShape).parse(rawArgs);

          return next(root, args, ctx, info);
        } catch (_error) {
          const error = _error as Error | ZodError;

          throw formatError({ error, args, ctx });
        }
      };
      // if validate property is function, execute it before validation
    } else if (typeof validate === "function") {
      return async (root, rawArgs, ctx, info, next) => {
        try {
          const schemaBase = await validate(rawArgs, ctx);
          // clone args so we can transform them when validating with zod
          let args = { ...rawArgs };
          if (typeof schemaBase !== "undefined") {
            Object.keys(schemaBase).forEach((k) => {
              if (schemaBase[k] === undefined) delete schemaBase[k];
            });

            const schema = z.object(schemaBase as ZodRawShape);
            const parseResult = schema.parse(args);

            args = parseResult;
          }

          return next(root, args, ctx, info);
        } catch (_error) {
          const error = _error as Error | ZodError;

          throw formatError({ error, args, ctx });
        }
      };
    }

    console.error(
      "\x1b[33m%s\x1b[0m",
      `The validate property provided to [${
        config.fieldConfig.name
      }] with type [${
        config.fieldConfig.type
      }]. Should be a function or zod object, saw [${typeof validate}]`
    );
  };

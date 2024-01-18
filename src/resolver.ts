import {
  ArgsValue,
  CreateFieldResolverInfo,
  GetGen,
  MaybePromise,
  MiddlewareFn,
} from "nexus/dist/core";

import { ValidatePluginConfig } from "./index";
import { defaultFormatError } from "./error";
import { ZodError, ZodTypeAny, z } from "zod";

export type ValidateResolver<
  TypeName extends string,
  FieldName extends string,
> = (
  args: ArgsValue<TypeName, FieldName>,
  ctx: GetGen<"context">
) => MaybePromise<Record<
  keyof ArgsValue<TypeName, FieldName>,
  ZodTypeAny
> | void>;

export const resolver =
  (validateConfig: ValidatePluginConfig = {}) =>
  (config: CreateFieldResolverInfo): MiddlewareFn | undefined => {
    const { formatError = defaultFormatError } = validateConfig;

    const validate: ValidateResolver<any, any> =
      config.fieldConfig.extensions?.nexus?.config.validate;

    // if the field doesn't have an validate field,
    // don't worry about wrapping the resolver
    if (validate == null) {
      return;
    }

    if (typeof validate !== "function") {
      console.error(
        "\x1b[33m%s\x1b[0m",
        `The validate property provided to [${
          config.fieldConfig.name
        }] with type [${
          config.fieldConfig.type
        }]. Should be a function, saw [${typeof validate}]`
      );

      return;
    }

    const args = config?.fieldConfig?.args ?? {};
    if (Object.keys(args).length === 0) {
      console.error(
        "\x1b[33m%s\x1b[0m",
        `[${config.parentTypeConfig.name}.${config.fieldConfig.name}] does not have any arguments, but a validate function was passed`
      );
    }

    return async (root, rawArgs, ctx, info, next) => {
      try {
        const schemaBase = await validate(rawArgs, ctx);
        // clone args so we can transform them when validating with zod
        let args = { ...rawArgs };
        if (typeof schemaBase !== "undefined") {
          const schema = z.object(schemaBase);
          const parseResult = schema.safeParse(args);

          if (!parseResult.success) {
            throw formatError({ error: parseResult.error, args, ctx });
          }

          args = parseResult.data;
        }

        return next(root, args, ctx, info);
      } catch (_error) {
        const error = _error as Error | ZodError;

        throw formatError({ error, args, ctx });
      }
    };
  };

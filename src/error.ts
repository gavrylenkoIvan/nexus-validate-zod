import { GetGen } from "nexus/dist/core";
import { ZodError } from "zod";

export interface ValidatePluginErrorConfig {
  error: Error | ZodError;
  args: any;
  ctx: GetGen<"context">;
}

type UserInputErrorExtensions = {
  invalidArgs: string[];
  validationMessages?: string[];
  code?: string;
};

export class UserInputError extends Error {
  extensions: {
    invalidArgs: string[];
    code: string;
  };

  constructor(message: string, extensions: UserInputErrorExtensions) {
    super(message);

    this.extensions = {
      ...extensions,
      code: extensions.code || "BAD_USER_INPUT",
    };
  }
}

export const defaultFormatError = ({
  error,
}: ValidatePluginErrorConfig): Error => {
  if (error instanceof ZodError) {
    return new UserInputError("Validation failed", {
      invalidArgs: error.errors.flatMap((err) => err.path.toString()),
      validationMessages: error.errors.flatMap((err) => err.message),
    });
  }

  return error;
};

export { ZodError };

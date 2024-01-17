import { GetGen } from "nexus/dist/core";
import { ZodError } from "zod";

export interface ValidatePluginErrorConfig {
  error: Error | ZodError;
  args: any;
  ctx: GetGen<"context">;
}

export class UserInputError extends Error {
  extensions: {
    invalidArgs: string[];
    code: string;
  };

  constructor(
    message: string,
    extensions: {
      invalidArgs: string[];
      code?: string;
    }
  ) {
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
    return new UserInputError(error.errors[0].message, {
      invalidArgs: error.errors[0].path.map((value) => String(value)),
    });
  }

  return error;
};

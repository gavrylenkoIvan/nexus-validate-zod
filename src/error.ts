import { GetGen } from "nexus/dist/core";
import { ZodError } from "zod";

export interface ValidatePluginErrorConfig {
  error: Error | ZodError;
  args: any;
  ctx: GetGen<"context">;
}

type UserInputErrorExtensions = {
  validationErrors: Record<string, string>;
  code?: string;
};

export class UserInputError extends Error {
  extensions: {
    validationErrors?: Record<string, string>;
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
    const validationErrors: Record<string, string> = {};
    error.errors.forEach(
      (err) => (validationErrors[err.path[0]] = err.message)
    );

    return new UserInputError("Validation failed", {
      validationErrors,
    });
  }

  return error;
};

export { ZodError };

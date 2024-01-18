import { plugin } from "nexus";
import { printedGenTyping, printedGenTypingImport } from "nexus/dist/utils";

import { ValidatePluginErrorConfig, ZodError } from "./error";
import { resolver } from "./resolver";

const ValidateResolverImport = printedGenTypingImport({
  module: "nexus-validate-zod",
  bindings: ["ValidateResolver"],
});

const fieldDefTypes = printedGenTyping({
  optional: true,
  name: "validate",
  description: "Validate mutation arguments.",
  type: "ValidateResolver<TypeName, FieldName>",
  imports: [ValidateResolverImport],
});

export interface ValidatePluginConfig {
  formatError?: (config: ValidatePluginErrorConfig) => Error;
}

export const validatePlugin = (validateConfig: ValidatePluginConfig = {}) => {
  return plugin({
    name: "NexusValidate",
    description: "The validate plugin provides validation for arguments.",
    fieldDefTypes: fieldDefTypes,
    onCreateFieldResolver: resolver(validateConfig),
  });
};

export * from "./resolver";
export * from "./error";
export { ZodError };

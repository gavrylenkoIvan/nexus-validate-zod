import { graphql } from "graphql";
import { makeSchema, objectType } from "nexus";
import { intArg, mutationField, stringArg } from "nexus/dist/core";
import { UserInputError, validatePlugin } from "../src/index";
import { z } from "zod";

describe("validatePlugin", () => {
  const consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation(() => {});

  afterEach(() => {
    jest.resetAllMocks();
  });

  const schemaTypes = [
    objectType({
      name: "User",
      definition(t) {
        t.int("id");
      },
    }),
    mutationField("validate", {
      type: "User",
      args: {
        email: stringArg(),
        id: intArg(),
      },
      // @ts-ignore
      validate: (args, ctx) => {
        console.log(args);
        if (args.id !== ctx.user.id) {
          throw new UserInputError("Validation failed", {
            validationErrors: {
              id: "invalid id",
            },
          });
        }

        return {
          email: z.string().email(),
        };
      },
      resolve: () => ({ id: 1 }),
    }),
  ];

  const schemaTypesWithValidateObj = [
    objectType({
      name: "User",
      definition(t) {
        t.int("id");
      },
    }),
    mutationField("validate", {
      type: "User",
      args: {
        email: stringArg(),
        id: intArg(),
      },
      // @ts-ignore
      validate: {
        email: z.string().email(),
      },
      resolve: () => ({ id: 1 }),
    }),
  ];

  const testSchema = makeSchema({
    outputs: false,
    types: schemaTypes,
    nonNullDefaults: {
      output: true,
    },
    plugins: [validatePlugin()],
  });

  const testSchemaWithValidateObj = makeSchema({
    outputs: false,
    types: schemaTypesWithValidateObj,
    nonNullDefaults: {
      output: true,
    },
    plugins: [validatePlugin()],
  });

  const mockCtx = { user: { id: 1 } };

  const testOperation = (
    mutation: string,
    schema = testSchema,
    fields?: string
  ) => {
    return graphql({
      schema,
      source: `
        mutation {
          ${mutation} {
            ${fields ? fields : "id"}
          }
        }
      `,
      rootValue: {},
      contextValue: mockCtx,
    });
  };

  it("returns error of validation error", async () => {
    const { data, errors = [] } = await testOperation(
      'validate(email: "bad@email", id: 1)'
    );

    expect(data).toBeNull();
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual("Validation failed");
    expect(errors[0].extensions).toEqual({
      code: "BAD_USER_INPUT",
      validationErrors: {
        email: "Invalid email",
      },
    });
  });

  it("can returns data if validation passed", async () => {
    const { data, errors = [] } = await testOperation(
      'validate(email: "god@email.com", id: 1)'
    );

    expect(errors).toEqual([]);
    expect(data?.validate).toEqual({ id: 1 });
  });

  it("can check args agains context", async () => {
    const { data, errors = [] } = await testOperation(
      'validate(email: "good@email.com", id: 2)'
    );

    expect(data).toBeNull();
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual("Validation failed");
    expect(errors[0].extensions).toEqual({
      code: "BAD_USER_INPUT",
      validationErrors: {
        id: "invalid id",
      },
    });
  });

  it("warns if field are missing arguments", async () => {
    const schema = makeSchema({
      outputs: false,
      nonNullDefaults: {
        output: true,
      },
      plugins: [validatePlugin()],
      types: [
        objectType({
          name: "ShouldWarn",
          definition(t) {
            t.int("id", {
              // @ts-ignore
              validate: () => {},
            });
          },
        }),
        mutationField("shouldWarn", {
          type: "ShouldWarn",
          // @ts-ignore
          resolve: () => ({ id: 1 }),
        }),
      ],
    });

    const { data } = await testOperation("shouldWarn", schema);
    expect(data?.shouldWarn).toEqual({ id: 1 });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy.mock.calls[0]).toMatchSnapshot();
  });

  it("returns error if validate field is object and validation failed", async () => {
    const { data, errors = [] } = await testOperation(
      'validate(email: "bad@email", id: 1)',
      testSchemaWithValidateObj
    );

    expect(data).toBeNull();
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual("Validation failed");
    expect(errors[0].extensions).toEqual({
      code: "BAD_USER_INPUT",
      validationErrors: {
        email: "Invalid email",
      },
    });
  });

  it("returns data if validate field is object and validation passed", async () => {
    const { data, errors = [] } = await testOperation(
      'validate(email: "god@email.com", id: 1)',
      testSchemaWithValidateObj
    );

    expect(errors).toEqual([]);
    expect(data?.validate).toEqual({ id: 1 });
  });
});

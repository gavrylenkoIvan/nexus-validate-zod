import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { Context, context } from "./context";
import { schema } from "./schema";

const server = new ApolloServer<Context>({
  schema,
});

startStandaloneServer(server, {
  listen: { port: 4000 },
  context,
}).then(({ url }) => {
  console.log(`🚀  Server ready at: ${url}`);
});

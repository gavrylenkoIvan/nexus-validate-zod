export interface Context {
  secret: string;
}

export async function context({ req, res }): Promise<Context> {
  return { secret: "nexus" };
}

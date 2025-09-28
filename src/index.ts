import fastify from "fastify";

const server = fastify({ logger: true });

server.get("/", async (request, reply) => {
  return { hello: "world" };
});

const start = async () => {
  try {
    await server.listen({ port: 8080, host: "0.0.0.0" });
    console.log("Server started successfully");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

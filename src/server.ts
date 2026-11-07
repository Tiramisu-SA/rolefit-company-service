import { createApp } from "./app";
import { createPool, integer } from "./config";
import { logger } from "./logger";
import { migrate } from "./migrate";
import { PostgresCompanyRepository } from "./repository";

async function main() {
  const pool = createPool();
  await migrate(pool);
  const server = createApp(new PostgresCompanyRepository(pool)).listen(
    integer("PORT", 3008),
    process.env.HOST || "0.0.0.0",
    () => logger.info("Company HTTP listening"),
  );
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    server.close();
    await pool.end();
  }
  process.on("SIGTERM", () => void stop());
  process.on("SIGINT", () => void stop());
}
main().catch((error) => {
  logger.error("Company service failed to start", error);
  process.exitCode = 1;
});

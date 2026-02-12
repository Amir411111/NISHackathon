
const { loadEnv } = require("./config/env");
const { connectDb } = require("./config/db");
const { createApp } = require("./app");
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
async function main() {
  const env = loadEnv();

  // REQUIRED by task: mongoose.connect(process.env.MONGODB_URI)
  await connectDb(process.env.MONGODB_URI);

  const app = createApp(env);

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[backend] listening on http://localhost:${env.PORT}`);
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[backend] fatal", e);
  process.exit(1);
});

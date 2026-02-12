const dotenv = require("dotenv");

function loadEnv() {
  dotenv.config();

  const env = {
    PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
    CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-5-nano",
    OPENAI_VISION_MODEL: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-5-nano",
  };

  if (!env.MONGODB_URI) throw new Error("Missing env: MONGODB_URI");
  if (!env.JWT_SECRET) throw new Error("Missing env: JWT_SECRET");

  return env;
}

module.exports = { loadEnv };

// config.ts
import { load } from "./deps.ts";

interface Config {
  PORT: number;
  ANTHROPIC_API_KEY: string;
  ENV: "development" | "production" | "test";
  HOST: string;
}

const loadConfig = async (): Promise<Config> => {
  try {
    const env = await load();

    if (!env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required");
    }

    return {
      PORT: parseInt(env.PORT || "3000"),
      ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
      ENV: (env.ENV as Config["ENV"]) || "development",
      HOST: env.HOST || "localhost",
    };
  } catch (error: unknown) {
    // Proper type checking for the error object
    if (error instanceof Error && error.message.includes("Cannot find .env file")) {
      console.warn("No .env file found, using default values and environment variables");
      return {
        PORT: parseInt(Deno.env.get("PORT") || "3000"),
        ANTHROPIC_API_KEY: Deno.env.get("ANTHROPIC_API_KEY") || "",
        ENV: (Deno.env.get("ENV") as Config["ENV"]) || "development",
        HOST: Deno.env.get("HOST") || "localhost",
      };
    }
    
    // Re-throw other errors
    throw error;
  }
};

export const CONFIG = await loadConfig();

if (!CONFIG.ANTHROPIC_API_KEY) {
  throw new Error(
    "ANTHROPIC_API_KEY is required. Please set it in your .env file or environment variables."
  );
}

export type { Config };

export const IS_PRODUCTION = CONFIG.ENV === "production";
export const IS_TEST = CONFIG.ENV === "test";
export const IS_DEVELOPMENT = CONFIG.ENV === "development";
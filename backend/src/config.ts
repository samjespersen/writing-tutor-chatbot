// config.ts
import { load } from "@/deps.ts";

interface Config {
  PORT: number;
  ANTHROPIC_API_KEY: string;
  MODEL_NAME: string;
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
      MODEL_NAME: env.MODEL_NAME || "claude-3-sonnet-20240229"
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Cannot find .env file")) {
      console.warn("No .env file found, using default values and environment variables");
      return {
        PORT: parseInt(Deno.env.get("PORT") || "3000"),
        ANTHROPIC_API_KEY: Deno.env.get("ANTHROPIC_API_KEY") || "",
        MODEL_NAME: Deno.env.get("MODEL_NAME") || "claude-3-5-sonnet-20241022"
      };
    }
    throw error;
  }
};

export const CONFIG = await loadConfig();

if (!CONFIG.ANTHROPIC_API_KEY) {
  throw new Error(
    "ANTHROPIC_API_KEY is required. Please set it in your .env file or environment variables."
  );
}
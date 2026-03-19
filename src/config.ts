import "dotenv/config";

export interface BaseChainConfig {
  chainId: number;
  rpcUrl: string;
  name: string;
}

export interface AppConfig {
  veniceApiKey: string;
  veniceBaseUrl: string;
  baseChain: BaseChainConfig;
  privateKey: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    veniceApiKey: requireEnv("VENICE_API_KEY"),
    veniceBaseUrl: "https://api.venice.ai/api/v1",
    baseChain: {
      chainId: 8453,
      rpcUrl: process.env["BASE_RPC_URL"] ?? "https://mainnet.base.org",
      name: "Base",
    },
    privateKey: requireEnv("PRIVATE_KEY"),
  };
}

export const VENICE_BASE_URL = "https://api.venice.ai/api/v1";

export const BASE_CHAIN: BaseChainConfig = {
  chainId: 8453,
  rpcUrl: process.env["BASE_RPC_URL"] ?? "https://mainnet.base.org",
  name: "Base",
};

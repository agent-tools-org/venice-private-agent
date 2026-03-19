import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, VENICE_BASE_URL, BASE_CHAIN } from "../src/config.js";

describe("config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env["VENICE_API_KEY"] = "test-api-key";
    process.env["PRIVATE_KEY"] = "0xdeadbeef";
    process.env["BASE_RPC_URL"] = "https://custom-rpc.example.com";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should load config with valid env vars", () => {
    const config = loadConfig();
    expect(config.veniceApiKey).toBe("test-api-key");
    expect(config.privateKey).toBe("0xdeadbeef");
    expect(config.baseChain.rpcUrl).toBe("https://custom-rpc.example.com");
  });

  it("should throw when VENICE_API_KEY is missing", () => {
    delete process.env["VENICE_API_KEY"];
    expect(() => loadConfig()).toThrow("Missing required environment variable: VENICE_API_KEY");
  });

  it("should throw when PRIVATE_KEY is missing", () => {
    delete process.env["PRIVATE_KEY"];
    expect(() => loadConfig()).toThrow("Missing required environment variable: PRIVATE_KEY");
  });

  it("should use default RPC URL when BASE_RPC_URL is not set", () => {
    delete process.env["BASE_RPC_URL"];
    const config = loadConfig();
    expect(config.baseChain.rpcUrl).toBe("https://mainnet.base.org");
  });

  it("should export correct Venice base URL constant", () => {
    expect(VENICE_BASE_URL).toBe("https://api.venice.ai/api/v1");
  });

  it("should export correct Base chain config", () => {
    expect(BASE_CHAIN.chainId).toBe(8453);
    expect(BASE_CHAIN.name).toBe("Base");
  });
});

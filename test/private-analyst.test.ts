import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrivateAnalyst, parseRecommendation, type PortfolioData } from "../src/agent/private-analyst.js";
import { VeniceClient, type VeniceChatResponse } from "../src/llm/venice-client.js";

vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getBalance: vi.fn().mockResolvedValue(BigInt("1000000000000000000")),
      readContract: vi.fn().mockResolvedValue(BigInt("500000000000000000")),
    })),
  };
});

function makeMockVeniceResponse(content: string): VeniceChatResponse {
  return {
    id: "test-id",
    object: "chat.completion",
    created: Date.now(),
    model: "llama-3.3-70b",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    headers: { server: "venice-api" },
  };
}

describe("parseRecommendation", () => {
  it("should parse valid JSON recommendation", () => {
    const content = '{"action":"swap","confidence":0.85,"reasoning":"Diversify holdings"}';
    const result = parseRecommendation(content);
    expect(result.action).toBe("swap");
    expect(result.confidence).toBe(0.85);
    expect(result.reasoning).toBe("Diversify holdings");
    expect(result.privateInference).toBe(true);
  });

  it("should extract JSON from surrounding text", () => {
    const content =
      'Here is my analysis: {"action":"hold","confidence":0.6,"reasoning":"Market stable"} End.';
    const result = parseRecommendation(content);
    expect(result.action).toBe("hold");
    expect(result.confidence).toBe(0.6);
  });

  it("should return default when content is not JSON", () => {
    const result = parseRecommendation("I think you should hold your tokens.");
    expect(result.action).toBe("hold");
    expect(result.confidence).toBe(0.5);
    expect(result.privateInference).toBe(true);
  });

  it("should clamp confidence to 0-1 range", () => {
    const content = '{"action":"buy","confidence":1.5,"reasoning":"Very confident"}';
    const result = parseRecommendation(content);
    expect(result.confidence).toBe(1);
  });

  it("should handle missing fields gracefully", () => {
    const content = '{"action":"sell"}';
    const result = parseRecommendation(content);
    expect(result.action).toBe("sell");
    expect(result.confidence).toBe(0.5);
    expect(result.privateInference).toBe(true);
  });
});

describe("PrivateAnalyst", () => {
  let analyst: PrivateAnalyst;
  let mockVeniceClient: VeniceClient;

  beforeEach(() => {
    mockVeniceClient = {
      privateQuery: vi.fn().mockResolvedValue(
        makeMockVeniceResponse(
          '{"action":"rebalance","confidence":0.75,"reasoning":"Heavy WETH exposure"}'
        )
      ),
      chat: vi.fn(),
    } as unknown as VeniceClient;

    analyst = new PrivateAnalyst({
      rpcUrl: "https://mainnet.base.org",
      veniceClient: mockVeniceClient,
      model: "llama-3.3-70b",
    });
  });

  it("should read portfolio with mocked on-chain data", async () => {
    const portfolio = await analyst.readPortfolio("0x1234567890abcdef1234567890abcdef12345678");
    expect(portfolio.chainId).toBe(8453);
    expect(portfolio.nativeBalance).toBe("1");
    expect(portfolio.balances).toHaveLength(2);
    expect(portfolio.balances[0].symbol).toBe("WETH");
  });

  it("should analyze portfolio via Venice private query", async () => {
    const portfolio: PortfolioData = {
      walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 8453,
      balances: [
        {
          symbol: "WETH",
          address: "0x4200000000000000000000000000000000000006",
          balance: "0.5",
          decimals: 18,
        },
      ],
      nativeBalance: "1.0",
      timestamp: Date.now(),
    };

    const result = await analyst.analyzePortfolio(portfolio);
    expect(result.action).toBe("rebalance");
    expect(result.confidence).toBe(0.75);
    expect(result.privateInference).toBe(true);
    expect(mockVeniceClient.privateQuery).toHaveBeenCalledOnce();
  });

  it("should run full pipeline and return headers", async () => {
    const result = await analyst.run("0x1234567890abcdef1234567890abcdef12345678");
    expect(result.portfolio).toBeDefined();
    expect(result.recommendation.action).toBe("rebalance");
    expect(result.responseHeaders).toEqual({ server: "venice-api" });
  });

  it("should handle empty LLM response gracefully", async () => {
    (mockVeniceClient.privateQuery as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeMockVeniceResponse("")
    );

    const portfolio: PortfolioData = {
      walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 8453,
      balances: [],
      nativeBalance: "0",
      timestamp: Date.now(),
    };

    const result = await analyst.analyzePortfolio(portfolio);
    expect(result.action).toBe("hold");
    expect(result.privateInference).toBe(true);
  });

  it("should use specified model", async () => {
    const deepseekAnalyst = new PrivateAnalyst({
      rpcUrl: "https://mainnet.base.org",
      veniceClient: mockVeniceClient,
      model: "deepseek-r1-671b",
    });

    await deepseekAnalyst.run("0x1234567890abcdef1234567890abcdef12345678");
    expect(mockVeniceClient.privateQuery).toHaveBeenCalledWith(
      expect.any(String),
      "deepseek-r1-671b"
    );
  });
});

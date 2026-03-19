import { createPublicClient, http, formatEther, formatUnits, type Address } from "viem";
import { base } from "viem/chains";
import { VeniceClient, type VeniceModel } from "../llm/venice-client.js";

export interface TokenBalance {
  symbol: string;
  address: Address;
  balance: string;
  decimals: number;
}

export interface PortfolioData {
  walletAddress: Address;
  chainId: number;
  balances: TokenBalance[];
  nativeBalance: string;
  timestamp: number;
}

export interface Recommendation {
  action: string;
  confidence: number;
  reasoning: string;
  privateInference: true;
}

export interface AnalystOptions {
  rpcUrl: string;
  veniceClient: VeniceClient;
  model?: VeniceModel;
}

const KNOWN_TOKENS: Array<{ symbol: string; address: Address; decimals: number }> = [
  {
    symbol: "WETH",
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18,
  },
  {
    symbol: "USDC",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
  },
];

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export class PrivateAnalyst {
  private rpcUrl: string;
  private veniceClient: VeniceClient;
  private model: VeniceModel;

  constructor(options: AnalystOptions) {
    this.rpcUrl = options.rpcUrl;
    this.veniceClient = options.veniceClient;
    this.model = options.model ?? "llama-3.3-70b";
  }

  async readPortfolio(walletAddress: Address): Promise<PortfolioData> {
    const client = createPublicClient({
      chain: base,
      transport: http(this.rpcUrl),
    });

    const nativeBalance = await client.getBalance({ address: walletAddress });

    const balances: TokenBalance[] = [];
    for (const token of KNOWN_TOKENS) {
      const raw = await client.readContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [walletAddress],
      });

      const formatted = formatUnits(raw, token.decimals);

      balances.push({
        symbol: token.symbol,
        address: token.address,
        balance: formatted,
        decimals: token.decimals,
      });
    }

    return {
      walletAddress,
      chainId: 8453,
      balances,
      nativeBalance: formatEther(nativeBalance),
      timestamp: Date.now(),
    };
  }

  async analyzePortfolio(portfolio: PortfolioData): Promise<Recommendation> {
    const prompt = buildAnalysisPrompt(portfolio);
    const response = await this.veniceClient.privateQuery(prompt, this.model);

    const content = response.choices[0]?.message?.content ?? "";
    return parseRecommendation(content);
  }

  async run(walletAddress: Address): Promise<{
    portfolio: PortfolioData;
    recommendation: Recommendation;
    responseModel: string;
    responseHeaders: Record<string, string>;
  }> {
    const portfolio = await this.readPortfolio(walletAddress);
    const prompt = buildAnalysisPrompt(portfolio);
    const response = await this.veniceClient.privateQuery(prompt, this.model);

    const content = response.choices[0]?.message?.content ?? "";
    const recommendation = parseRecommendation(content);

    return {
      portfolio,
      recommendation,
      responseModel: response.model,
      responseHeaders: response.headers ?? {},
    };
  }
}

function buildAnalysisPrompt(portfolio: PortfolioData): string {
  const balanceLines = portfolio.balances
    .map((b) => `  ${b.symbol}: ${b.balance}`)
    .join("\n");

  return `Analyze this Base chain portfolio and suggest rebalancing actions.
Wallet: ${portfolio.walletAddress}
Native ETH: ${portfolio.nativeBalance}
Token Balances:
${balanceLines}

Respond ONLY with valid JSON in this format:
{"action":"<suggested action>","confidence":<0-1>,"reasoning":"<brief explanation>"}`;
}

export function parseRecommendation(content: string): Recommendation {
  try {
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        action?: string;
        confidence?: number;
        reasoning?: string;
      };
      return {
        action: parsed.action ?? "hold",
        confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
        reasoning: parsed.reasoning ?? "Unable to parse full reasoning",
        privateInference: true,
      };
    }
  } catch {
    // fall through to default
  }

  return {
    action: "hold",
    confidence: 0.5,
    reasoning: "Could not parse LLM response; defaulting to hold",
    privateInference: true,
  };
}

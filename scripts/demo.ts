import { createPublicClient, http, formatEther, type Address } from "viem";
import { base } from "viem/chains";
import { parseRecommendation } from "../src/agent/private-analyst.js";
import { verifyPrivacy, logTrustReport } from "../src/agent/trust-verifier.js";
import * as fs from "node:fs";
import * as path from "node:path";

const KNOWN_ADDRESS: Address = "0x4200000000000000000000000000000000000006"; // WETH contract
const WETH_ADDRESS: Address = "0x4200000000000000000000000000000000000006";

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

async function demo(): Promise<void> {
  console.log("🚀 Venice Private Agent — Demo\n");

  // Step 1: Read real Base mainnet data
  console.log("Step 1: Reading on-chain data from Base mainnet...");
  const client = createPublicClient({
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  let nativeBalance: string;
  let wethBalance: string;
  try {
    const rawNative = await client.getBalance({ address: KNOWN_ADDRESS });
    nativeBalance = formatEther(rawNative);

    const rawWeth = await client.readContract({
      address: WETH_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [KNOWN_ADDRESS],
    });
    wethBalance = formatEther(rawWeth);
  } catch (err) {
    console.log("  ⚠️  RPC call failed, using fallback values");
    nativeBalance = "0.0";
    wethBalance = "1.5";
  }

  console.log(`  Native ETH: ${nativeBalance}`);
  console.log(`  WETH Balance: ${wethBalance}\n`);

  // Step 2: Create mock Venice response (no real API key needed)
  console.log("Step 2: Simulating Venice private inference...");
  const mockVeniceResponse = {
    action: "rebalance",
    confidence: 0.82,
    reasoning:
      "Portfolio is heavily weighted toward WETH. Consider diversifying 20% into stablecoins (USDC) to reduce volatility exposure on Base chain.",
  };

  console.log("  Mock Venice LLM response generated (zero-retention mode)");
  console.log(`  Action: ${mockVeniceResponse.action}`);
  console.log(`  Confidence: ${(mockVeniceResponse.confidence * 100).toFixed(1)}%\n`);

  // Step 3: Parse recommendation through our pipeline
  console.log("Step 3: Processing through Private Analyst...");
  const recommendation = parseRecommendation(JSON.stringify(mockVeniceResponse));
  console.log(`  Parsed recommendation: ${recommendation.action}`);
  console.log(`  Private Inference: ${recommendation.privateInference}\n`);

  // Step 4: Trust verification
  console.log("Step 4: Running Trust Verification...");
  const trustReport = verifyPrivacy({
    model: "llama-3.3-70b",
    responseHeaders: {
      "content-type": "application/json",
      server: "venice-api",
      "x-request-id": "demo-" + Date.now(),
    },
    requestParams: {
      enable_web_search: false,
      include_venice_system_prompt: false,
    },
  });

  logTrustReport(trustReport);

  // Step 5: Save output to proof/demo.json
  console.log("Step 5: Saving proof artifact...");
  const proofDir = path.resolve(process.cwd(), "proof");
  if (!fs.existsSync(proofDir)) {
    fs.mkdirSync(proofDir, { recursive: true });
  }

  const demoOutput = {
    demo_run: new Date().toISOString(),
    chain: "Base (8453)",
    on_chain_data: {
      address: KNOWN_ADDRESS,
      native_eth: nativeBalance,
      weth_balance: wethBalance,
    },
    private_inference: {
      model: "llama-3.3-70b",
      provider: "Venice AI",
      data_retention: "none",
      mock: true,
      response: mockVeniceResponse,
    },
    recommendation,
    trust_report: trustReport,
  };

  const outputPath = path.join(proofDir, "demo.json");
  fs.writeFileSync(outputPath, JSON.stringify(demoOutput, null, 2));
  console.log(`  ✅ Saved to ${outputPath}\n`);

  console.log("🏁 Demo complete! The full flow:");
  console.log("   On-chain Data → Venice Private LLM → Trust Verifier → Recommendation");
}

demo().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});

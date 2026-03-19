import { loadConfig } from "./config.js";
import { VeniceClient } from "./llm/venice-client.js";
import { PrivateAnalyst } from "./agent/private-analyst.js";
import { verifyPrivacy, logTrustReport } from "./agent/trust-verifier.js";
import { type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";

async function main(): Promise<void> {
  const config = loadConfig();

  const veniceClient = new VeniceClient({
    apiKey: config.veniceApiKey,
    baseUrl: config.veniceBaseUrl,
  });

  const analyst = new PrivateAnalyst({
    rpcUrl: config.baseChain.rpcUrl,
    veniceClient,
    model: "llama-3.3-70b",
  });

  const privateKeyHex = config.privateKey.startsWith("0x")
    ? (config.privateKey as `0x${string}`)
    : (`0x${config.privateKey}` as `0x${string}`);
  const account = privateKeyToAccount(privateKeyHex as `0x${string}`);
  const walletAddress = account.address;

  console.log("🔒 Venice Private Agent starting...");
  console.log(`Chain: ${config.baseChain.name} (ID: ${config.baseChain.chainId})`);

  let running = true;
  process.on("SIGINT", () => {
    console.log("\n🛑 Graceful shutdown...");
    running = false;
  });

  while (running) {
    try {
      console.log("\n📊 Reading on-chain portfolio...");
      const { portfolio, recommendation, responseModel, responseHeaders } =
        await analyst.run(walletAddress);

      console.log(`Portfolio: ${portfolio.balances.length} tokens tracked`);
      console.log(`Native ETH: ${portfolio.nativeBalance}`);

      const trustReport = verifyPrivacy({
        model: "llama-3.3-70b",
        responseModel,
        responseHeaders,
        requestParams: {
          enable_web_search: false,
          include_venice_system_prompt: false,
        },
      });

      logTrustReport(trustReport);

      console.log("📋 Recommendation:");
      console.log(`  Action: ${recommendation.action}`);
      console.log(`  Confidence: ${(recommendation.confidence * 100).toFixed(1)}%`);
      console.log(`  Reasoning: ${recommendation.reasoning}`);
      console.log(`  Private Inference: ${recommendation.privateInference}`);

      // Wait before next cycle
      if (running) {
        console.log("\n⏳ Waiting 60s before next analysis...");
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 60_000);
          process.once("SIGINT", () => {
            clearTimeout(timer);
            running = false;
            resolve();
          });
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error: ${msg}`);
      if (running) {
        await new Promise((resolve) => setTimeout(resolve, 10_000));
      }
    }
  }

  console.log("👋 Agent stopped.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

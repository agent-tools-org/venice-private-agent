# Venice Private Agent

**Private Agents, Trusted Actions** — A privacy-first on-chain agent powered by Venice AI's zero-retention LLM inference.

## Why Venice?

Traditional LLM providers (OpenAI, Anthropic, Google) store prompts and responses for training, moderation, and analytics. When you send portfolio data — wallet addresses, token balances, trading strategies — to these providers, that sensitive financial data becomes part of their dataset. Venice AI is fundamentally different:

- **Zero data retention**: Prompts and responses are never stored, logged, or used for training
- **No prompt inspection**: Venice does not review or moderate inference content
- **OpenAI-compatible API**: Drop-in replacement — no SDK changes needed
- **Open-source models**: Uses auditable open-weight models (LLaMA, DeepSeek)
- **Privacy by architecture**: The inference pipeline is designed so data cannot persist

For on-chain agents that handle sensitive financial data, Venice is the only LLM provider where "private inference" is a guarantee, not a policy promise.

## Architecture

```
On-chain Data (Base) → Venice Private LLM → Trust Verifier → Recommendation
```

1. **On-chain Data Collection**: Reads wallet balances and token holdings from Base mainnet using `viem`
2. **Venice Private LLM**: Sends portfolio data to Venice AI for analysis — zero data retention, no prompts or responses stored
3. **Trust Verifier**: Validates that inference was truly private (web search disabled, system prompt excluded, known model used)
4. **Recommendation**: Returns structured rebalancing advice with confidence scores and privacy attestation

## Privacy Architecture

This agent enforces privacy at every layer of the inference pipeline:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Privacy Guarantees                          │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Request Isolation                                     │
│    • enable_web_search: false  → no external data leakage       │
│    • include_venice_system_prompt: false → clean inference       │
│    • Bearer token auth only → no session tracking               │
│                                                                 │
│  Layer 2: Zero-Retention Inference                              │
│    • Venice does not store prompts or completions               │
│    • No training on user data                                   │
│    • No logging of request/response content                     │
│                                                                 │
│  Layer 3: Trust Verification                                    │
│    • Verify model is a known Venice model                       │
│    • Verify privacy params were enforced                        │
│    • Verify response originated from Venice API                 │
│    • Generate signed attestation report                         │
│                                                                 │
│  Layer 4: Local-Only Storage                                    │
│    • Proof artifacts saved locally to proof/ directory           │
│    • No data sent to third-party analytics or logging services  │
│    • Trust reports are self-contained and offline-verifiable     │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Sequence

```
 Wallet          Agent           Venice API        Trust Verifier
   │                │                │                   │
   │  read balance  │                │                   │
   │◄──────────────►│                │                   │
   │                │                │                   │
   │                │  POST /chat/completions            │
   │                │  (web_search=false,                │
   │                │   system_prompt=false)             │
   │                │───────────────►│                   │
   │                │                │                   │
   │                │  JSON response │                   │
   │                │  + headers     │                   │
   │                │◄───────────────│                   │
   │                │                │                   │
   │                │  verify(model, headers, params)    │
   │                │───────────────────────────────────►│
   │                │                                    │
   │                │  TrustReport { verified, attested }│
   │                │◄───────────────────────────────────│
   │                │                │                   │
   │  recommendation│                │                   │
   │◄───────────────│                │                   │
```

## Venice API Model Comparison

| Feature | `llama-3.3-70b` | `deepseek-r1-671b` |
|---|---|---|
| **Parameters** | 70 billion | 671 billion |
| **Architecture** | LLaMA 3.3 | DeepSeek R1 |
| **Best For** | Fast general analysis | Complex reasoning tasks |
| **Latency** | Lower (~2-5s) | Higher (~5-15s) |
| **Context Window** | 128K tokens | 128K tokens |
| **Reasoning** | Good | Excellent (chain-of-thought) |
| **Cost Efficiency** | Higher throughput | Lower throughput |
| **Recommended Use** | Default portfolio analysis | Deep market research |
| **Open Weights** | ✅ Yes | ✅ Yes |
| **Zero Retention** | ✅ Yes | ✅ Yes |

**Default**: This agent uses `llama-3.3-70b` for its balance of speed and quality. Switch to `deepseek-r1-671b` for complex multi-token portfolio analysis where deeper reasoning is beneficial.

## Zero-Retention Privacy

Venice AI provides **zero-retention inference** — your prompts and model responses are never stored, logged, or used for training. This agent leverages this guarantee to:

- Analyze sensitive portfolio data without exposure to centralized providers
- Make trusted on-chain decisions while keeping financial data private
- Generate cryptographic-style trust reports attesting to inference privacy

## Venice API Compatibility

Venice exposes an **OpenAI-compatible API** at `https://api.venice.ai/api/v1`. This means:

- Standard `/chat/completions` endpoint
- Bearer token authentication
- Compatible with any OpenAI SDK client

Venice-specific extensions:
- `enable_web_search`: Control whether web search augments responses
- `include_venice_system_prompt`: Control Venice's default system prompt

Available models: `llama-3.3-70b`, `deepseek-r1-671b`

## Setup

```bash
# Clone and install
git clone <repo-url>
cd venice-private-agent
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Venice API key and wallet private key
```

## Configuration

| Variable | Description | Default |
|---|---|---|
| `VENICE_API_KEY` | Your Venice AI API key | Required |
| `PRIVATE_KEY` | Wallet private key for on-chain reads | Required |
| `BASE_RPC_URL` | Base chain RPC endpoint | `https://mainnet.base.org` |

## Usage

### Run the Agent

```bash
npm start
```

The agent runs in a loop: reads portfolio → analyzes privately → verifies trust → outputs recommendation. Press `Ctrl+C` for graceful shutdown.

### Run the Demo

```bash
npm run demo
```

Reads real Base mainnet data, simulates Venice inference, and saves a proof artifact to `proof/demo.json`.

### Run Tests

```bash
npm test
```

All tests run offline with mocked HTTP calls.

## Project Structure

```
src/
  config.ts                 # Environment config and chain setup
  index.ts                  # Main agent loop
  llm/
    venice-client.ts        # OpenAI-compatible Venice API client
  agent/
    private-analyst.ts      # Portfolio reader + LLM analyst
    trust-verifier.ts       # Privacy attestation and trust reports
test/
  config.test.ts
  venice-client.test.ts
  private-analyst.test.ts
  trust-verifier.test.ts
scripts/
  demo.ts                  # Demo script with real on-chain data
```

## Hackathon

Built for the **Private Agents, Trusted Actions** track sponsored by Venice AI ($11.5K prize).

Track focus: Build agents that use Venice's private, zero-retention LLM inference to make trusted on-chain decisions without exposing user data to centralized providers.

## License

MIT

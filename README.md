# Venice Private Agent

**Private Agents, Trusted Actions** — A privacy-first on-chain agent powered by Venice AI's zero-retention LLM inference.

## Architecture

```
On-chain Data (Base) → Venice Private LLM → Trust Verifier → Recommendation
```

1. **On-chain Data Collection**: Reads wallet balances and token holdings from Base mainnet using `viem`
2. **Venice Private LLM**: Sends portfolio data to Venice AI for analysis — zero data retention, no prompts or responses stored
3. **Trust Verifier**: Validates that inference was truly private (web search disabled, system prompt excluded, known model used)
4. **Recommendation**: Returns structured rebalancing advice with confidence scores and privacy attestation

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

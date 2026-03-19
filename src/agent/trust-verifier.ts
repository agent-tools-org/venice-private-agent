export interface TrustReport {
  timestamp: number;
  model: string;
  privacy_mode: boolean;
  data_retention: "none";
  attestation: string;
  verified: boolean;
}

export interface VerificationInput {
  model: string;
  responseModel: string;
  responseHeaders: Record<string, string>;
  requestParams: {
    enable_web_search: boolean;
    include_venice_system_prompt: boolean;
  };
}

export function verifyPrivacy(input: VerificationInput): TrustReport {
  const checks: string[] = [];
  let verified = true;

  // Check 1: Web search was disabled (no external data leakage)
  if (input.requestParams.enable_web_search === false) {
    checks.push("web_search_disabled");
  } else {
    verified = false;
    checks.push("WARN: web_search was enabled");
  }

  // Check 2: Venice system prompt was excluded (clean inference)
  if (input.requestParams.include_venice_system_prompt === false) {
    checks.push("venice_system_prompt_excluded");
  } else {
    verified = false;
    checks.push("WARN: venice_system_prompt was included");
  }

  // Check 3: Model is a known Venice model
  const knownModels = ["llama-3.3-70b", "deepseek-r1-671b"];
  if (input.responseModel !== input.model) {
    verified = false;
    checks.push(
      `WARN: response model mismatch expected ${input.model} got ${input.responseModel}`
    );
  } else {
    checks.push("model_matches_response");
  }

  if (knownModels.includes(input.responseModel)) {
    checks.push("known_venice_model");
  } else {
    verified = false;
    checks.push(`WARN: unknown model ${input.responseModel}`);
  }

  // Check 4: Response came from Venice API (check headers if available)
  const serverHeader = (input.responseHeaders["server"] ?? "").toLowerCase();
  const xServedBy = (input.responseHeaders["x-served-by"] ?? "").toLowerCase();
  const hasVeniceHeaders =
    serverHeader.includes("venice") || xServedBy.includes("venice");

  if (hasVeniceHeaders) {
    checks.push("venice_api_response_confirmed");
  } else {
    verified = false;
    checks.push("WARN: missing venice-specific response headers");
  }

  const attestation = [
    "Privacy Attestation:",
    `  Model: ${input.model}`,
    `  Checks: ${checks.join(", ")}`,
    `  Verified: ${verified}`,
    `  Data Retention: none`,
    `  Venice zero-retention policy: prompts and responses are not stored`,
  ].join("\n");

  return {
    timestamp: Date.now(),
    model: input.model,
    privacy_mode: verified,
    data_retention: "none",
    attestation,
    verified,
  };
}

export function logTrustReport(report: TrustReport): void {
  console.log("\n=== Trust Verification Report ===");
  console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
  console.log(`Model: ${report.model}`);
  console.log(`Privacy Mode: ${report.privacy_mode}`);
  console.log(`Data Retention: ${report.data_retention}`);
  console.log(`Verified: ${report.verified}`);
  console.log(report.attestation);
  console.log("================================\n");
}

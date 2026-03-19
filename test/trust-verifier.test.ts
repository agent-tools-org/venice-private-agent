import { describe, it, expect } from "vitest";
import { verifyPrivacy, type TrustReport } from "../src/agent/trust-verifier.js";

describe("trust-verifier", () => {
  it("should verify privacy when all conditions met", () => {
    const report = verifyPrivacy({
      model: "llama-3.3-70b",
      responseModel: "llama-3.3-70b",
      responseHeaders: { server: "venice-api" },
      requestParams: {
        enable_web_search: false,
        include_venice_system_prompt: false,
      },
    });

    expect(report.verified).toBe(true);
    expect(report.privacy_mode).toBe(true);
    expect(report.data_retention).toBe("none");
    expect(report.model).toBe("llama-3.3-70b");
  });

  it("should fail verification when web search is enabled", () => {
    const report = verifyPrivacy({
      model: "llama-3.3-70b",
      responseModel: "llama-3.3-70b",
      responseHeaders: {},
      requestParams: {
        enable_web_search: true,
        include_venice_system_prompt: false,
      },
    });

    expect(report.verified).toBe(false);
    expect(report.privacy_mode).toBe(false);
    expect(report.attestation).toContain("WARN: web_search was enabled");
  });

  it("should fail verification when venice system prompt is included", () => {
    const report = verifyPrivacy({
      model: "llama-3.3-70b",
      responseModel: "llama-3.3-70b",
      responseHeaders: {},
      requestParams: {
        enable_web_search: false,
        include_venice_system_prompt: true,
      },
    });

    expect(report.verified).toBe(false);
    expect(report.attestation).toContain("WARN: venice_system_prompt was included");
  });

  it("should fail verification for unknown model", () => {
    const report = verifyPrivacy({
      model: "unknown-model",
      responseModel: "unknown-model",
      responseHeaders: {},
      requestParams: {
        enable_web_search: false,
        include_venice_system_prompt: false,
      },
    });

    expect(report.verified).toBe(false);
    expect(report.attestation).toContain("WARN: unknown model unknown-model");
  });

  it("should include timestamp in report", () => {
    const before = Date.now();
    const report = verifyPrivacy({
      model: "deepseek-r1-671b",
      responseModel: "deepseek-r1-671b",
      responseHeaders: { server: "venice-api" },
      requestParams: {
        enable_web_search: false,
        include_venice_system_prompt: false,
      },
    });
    const after = Date.now();

    expect(report.timestamp).toBeGreaterThanOrEqual(before);
    expect(report.timestamp).toBeLessThanOrEqual(after);
    expect(report.model).toBe("deepseek-r1-671b");
  });

  it("should always set data_retention to none", () => {
    const report = verifyPrivacy({
      model: "llama-3.3-70b",
      responseModel: "llama-3.3-70b",
      responseHeaders: {},
      requestParams: {
        enable_web_search: true,
        include_venice_system_prompt: true,
      },
    });

    expect(report.data_retention).toBe("none");
  });

  it("should handle missing response headers gracefully", () => {
    const report = verifyPrivacy({
      model: "llama-3.3-70b",
      responseModel: "llama-3.3-70b",
      responseHeaders: {},
      requestParams: {
        enable_web_search: false,
        include_venice_system_prompt: false,
      },
    });

    expect(report.verified).toBe(false);
    expect(report.privacy_mode).toBe(false);
    expect(report.attestation).not.toContain("venice_api_response_confirmed");
    expect(report.attestation).toContain(
      "WARN: missing venice-specific response headers"
    );
  });

  it("should fail verification when all conditions are violated (tampered response)", () => {
    const report = verifyPrivacy({
      model: "gpt-4-turbo",
      responseModel: "gpt-4-turbo",
      responseHeaders: {},
      requestParams: {
        enable_web_search: true,
        include_venice_system_prompt: true,
      },
    });

    expect(report.verified).toBe(false);
    expect(report.privacy_mode).toBe(false);
    expect(report.attestation).toContain("WARN: web_search was enabled");
    expect(report.attestation).toContain("WARN: venice_system_prompt was included");
    expect(report.attestation).toContain("WARN: unknown model gpt-4-turbo");
  });

  it("should include attestation details for verified deepseek model", () => {
    const report = verifyPrivacy({
      model: "deepseek-r1-671b",
      responseModel: "deepseek-r1-671b",
      responseHeaders: { "x-served-by": "venice-inference" },
      requestParams: {
        enable_web_search: false,
        include_venice_system_prompt: false,
      },
    });

    expect(report.verified).toBe(true);
    expect(report.model).toBe("deepseek-r1-671b");
    expect(report.attestation).toContain("known_venice_model");
    expect(report.attestation).toContain("venice_api_response_confirmed");
    expect(report.attestation).toContain("Data Retention: none");
  });
});

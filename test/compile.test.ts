import { describe, it, expect } from "vitest";
import { compileSolidity, compileContract } from "../src/compile.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONTRACT_SOURCE = readFileSync(
  join(__dirname, "..", "contracts", "PrivacyAttestation.sol"),
  "utf-8"
);

describe("compile", () => {
  it("should compile PrivacyAttestation.sol successfully", () => {
    const result = compileSolidity(CONTRACT_SOURCE, "PrivacyAttestation");

    expect(result.contractName).toBe("PrivacyAttestation");
    expect(result.abi).toBeInstanceOf(Array);
    expect(result.abi.length).toBeGreaterThan(0);
    expect(result.bytecode).toMatch(/^0x[0-9a-fA-F]+$/);
  });

  it("should include all expected ABI entries", () => {
    const result = compileSolidity(CONTRACT_SOURCE, "PrivacyAttestation");

    const names = result.abi
      .filter((e: any) => e.type === "function" || e.type === "event")
      .map((e: any) => e.name);

    expect(names).toContain("logAttestation");
    expect(names).toContain("getAttestationCount");
    expect(names).toContain("getAttestation");
    expect(names).toContain("getPrivateAttestationCount");
    expect(names).toContain("AttestationLogged");
  });

  it("should throw on invalid Solidity source", () => {
    expect(() =>
      compileSolidity("this is not valid solidity", "Bad")
    ).toThrow("Compilation failed");
  });

  it("should throw when contract name not found in output", () => {
    const valid = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
contract Other { function x() external pure returns (uint256) { return 1; } }`;

    expect(() => compileSolidity(valid, "Missing")).toThrow(
      "Contract Missing not found"
    );
  });

  it("should compile via compileContract helper", () => {
    const result = compileContract();

    expect(result.contractName).toBe("PrivacyAttestation");
    expect(result.abi.length).toBeGreaterThan(0);
    expect(result.bytecode.startsWith("0x")).toBe(true);
  });
});

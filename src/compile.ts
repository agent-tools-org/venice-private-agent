import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface CompileResult {
  abi: unknown[];
  bytecode: string;
  contractName: string;
}

export function compileSolidity(sourceCode: string, contractName: string): CompileResult {
  const input = {
    language: "Solidity",
    sources: {
      [`${contractName}.sol`]: { content: sourceCode },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter(
      (e: { severity: string }) => e.severity === "error"
    );
    if (errors.length > 0) {
      const messages = errors.map(
        (e: { formattedMessage: string }) => e.formattedMessage
      );
      throw new Error(`Compilation failed:\n${messages.join("\n")}`);
    }
  }

  const contractFile = output.contracts[`${contractName}.sol`];
  if (!contractFile || !contractFile[contractName]) {
    throw new Error(`Contract ${contractName} not found in compilation output`);
  }

  const compiled = contractFile[contractName];
  return {
    abi: compiled.abi,
    bytecode: `0x${compiled.evm.bytecode.object}`,
    contractName,
  };
}

export function compileContract(): CompileResult {
  const contractPath = join(__dirname, "..", "contracts", "PrivacyAttestation.sol");
  const source = readFileSync(contractPath, "utf-8");
  return compileSolidity(source, "PrivacyAttestation");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = compileContract();
  const outDir = join(__dirname, "..", "artifacts");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "PrivacyAttestation.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Compiled ${result.contractName} -> ${outPath}`);
  console.log(`ABI entries: ${result.abi.length}`);
  console.log(`Bytecode size: ${result.bytecode.length} chars`);
}

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant, TransactionStatus } from "genlayer-js/types";

const addressEl = document.querySelector("#address");
const ruleEl = document.querySelector("#rule");
const urlEl = document.querySelector("#url");
const walletEl = document.querySelector("#wallet");
const statusEl = document.querySelector("#status");
const errorEl = document.querySelector("#error");
const resultEl = document.querySelector("#result");
const caseEl = document.querySelector("#case");

let client = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function setError(text) {
  errorEl.textContent = text || "";
}

function contractAddress() {
  const address = addressEl.value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error("Enter the deployed contract address from Studio.");
  }
  return address;
}

function inputs() {
  const rule = ruleEl.value.trim();
  const evidenceUrl = urlEl.value.trim();
  if (rule.length < 1 || rule.length > 500) {
    throw new Error("Rule must be 1 to 500 characters.");
  }
  if (
    evidenceUrl.length > 400 ||
    !(evidenceUrl.startsWith("https://") || evidenceUrl.startsWith("http://")) ||
    /\s/.test(evidenceUrl)
  ) {
    throw new Error("Evidence URL must be an http(s) URL with no spaces.");
  }
  return { rule, evidenceUrl };
}

function showResult(value, mine) {
  const data = value && typeof value === "object" ? value : {};
  const ids = Array.isArray(mine) ? mine.join(", ") : "";
  resultEl.textContent = [
    `case: ${data.case_id || "(none)"}`,
    `caller: ${data.caller || ""}`,
    `verdict: ${data.verdict || "(none)"}`,
    `explanation: ${data.explanation || ""}`,
    `rule: ${data.rule || ""}`,
    `evidence: ${data.evidence_url || ""}`,
    ids ? `your cases: ${ids}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function myCaseIds(address) {
  const ids = await client.readContract({
    address,
    functionName: "get_my_case_ids",
    args: [],
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
  });
  return Array.isArray(ids) ? ids.map((item) => String(item)) : [];
}

async function connect() {
  if (!window.ethereum) {
    throw new Error("No browser wallet found.");
  }
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  client = createClient({
    chain: studionet,
    account: accounts[0],
    provider: window.ethereum,
  });
  await client.connect("studionet");
  walletEl.textContent = accounts[0];
}

async function readSaved() {
  setError("");
  const address = contractAddress();
  if (!client) await connect();
  const requested = caseEl.value.trim();
  setStatus("reading case");
  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const mine = await myCaseIds(address);
      const caseId = requested || mine[mine.length - 1] || "";
      if (!caseId) {
        showResult({}, mine);
        setStatus("no cases for this wallet");
        return;
      }
      const value = await client.readContract({
        address,
        functionName: "get_case",
        args: [caseId],
        transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
      });
      showResult(value, mine);
      setStatus("finalized");
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  throw lastError;
}

async function verify() {
  setError("");
  const address = contractAddress();
  const { rule, evidenceUrl } = inputs();
  if (!client) await connect();

  setStatus("pending: waiting for wallet");
  const txId = await client.writeContract({
    address,
    functionName: "verify",
    args: [rule, evidenceUrl],
    value: 0n,
  });
  setStatus(`pending: ${txId}`);
  const receipt = await client.waitForTransactionReceipt({
    hash: txId,
    status: TransactionStatus.FINALIZED,
    interval: 5000,
    retries: 120,
  });
  const leader = receipt?.consensus_data?.leader_receipt?.find(
    (item) => item?.mode === "leader",
  );
  if (leader?.execution_result === "ERROR") {
    throw new Error("The transaction finalized, but the contract execution failed and saved nothing.");
  }
  setStatus("finalized");
  try {
    await readSaved();
  } catch (error) {
    setStatus("saved");
    setError("The case was saved. Put the case id in the field and click Read case.");
  }
}

document.querySelector("#connect").addEventListener("click", () => {
  connect().catch((error) => {
    setStatus("error");
    setError(error.message || String(error));
  });
});

document.querySelector("#read").addEventListener("click", () => {
  readSaved().catch((error) => {
    setStatus("error");
    setError(error.message || String(error));
  });
});

document.querySelector("#submit").addEventListener("click", () => {
  verify().catch((error) => {
    setStatus("error");
    setError(error.message || String(error));
  });
});

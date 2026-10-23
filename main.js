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

const stored = localStorage.getItem("rulecheck.address");
if (stored) addressEl.value = stored;

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
  localStorage.setItem("rulecheck.address", address);
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

function showResult(value) {
  const data = value && typeof value === "object" ? value : {};
  resultEl.textContent = [
    `verdict: ${data.verdict || "(none)"}`,
    `explanation: ${data.explanation || ""}`,
    `rule: ${data.rule || ""}`,
    `evidence: ${data.evidence_url || ""}`,
  ].join("\n");
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
  setStatus("reading saved state");
  const value = await client.readContract({
    address,
    functionName: "get_result",
    args: [],
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
  });
  showResult(value);
  setStatus("finalized");
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
    throw new Error(
      "The transaction finalized, but the contract failed and saved nothing. Use https://example.com/ exactly.",
    );
  }
  setStatus("finalized");
  await readSaved();
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

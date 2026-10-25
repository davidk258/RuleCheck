# RuleCheck

RuleCheck decides whether one public page satisfies one rule. Each verification is stored as its own case. The record contains a case id, the caller wallet address, the rule, the evidence URL, the verdict (`PASS`, `FAIL`, or `INCONCLUSIVE`), and a short explanation.

A new check is appended. It does not replace an older case. There is no method that overwrites a stored case.

The contract reads the page with `gl.nondet.web.render` and judges it with `gl.nondet.exec_prompt` inside `gl.eq_principle.prompt_comparative`. No off-chain model is used.

## What changed

The first submission kept one shared result. Any later caller could replace it, and nothing identified who had submitted the check.

This version adds:

- a case id for every check
- the caller address on that case
- `get_case(case_id)` to read one record back
- `get_my_case_ids()` to list the connected wallet's cases
- `get_case_count()` for the number of stored cases

The frontend source and its lockfile are included so the page can be rebuilt.

## Deployed contract

Checked on Studio Explorer:

- Network: Studionet, chain id `61999`
- Address: `0xC266A32dA172F38aeE516D066240c51e95d08788`
- Deploy tx: `0x7517bc765eaab362af88c8410a94bcea724dd01cc40b4aaf7f1081580bf3e5b6`
- Status: `FINALIZED`, leader execution `SUCCESS`

The earlier address `0x68A8b08b4da4c8a416bf3DF6413481F5dA117231` is not this version. Do not use it.

## Recorded check

One check was submitted and finalized.

- Verify tx: `0xbd8ef81ecb88a054be77d208951bc41f70404ca2cd942937d20c54968da01cb7`
- Status: `FINALIZED`, leader execution `SUCCESS`
- Case: `1`
- Caller: `0xF1cDAf2b4c36d77A2f84812323eE1AC4cA91Bafc`
- Rule: `The page says this domain is for use in documentation examples.`
- Evidence URL: `https://example.com/`
- Verdict: `PASS`
- Explanation: the page explicitly states that the domain is for use in documentation examples

## Files

```text
contracts/rule_check.py
frontend/package.json
frontend/package-lock.json
frontend/index.html
frontend/main.js
```

`frontend/package-lock.json` is the build manifest (`lockfileVersion` 3). It pins `genlayer-js@1.1.8` and Vite 6.

## Rebuild

From a clean checkout, with Node.js 22:

```bash
cd frontend
npm ci
npm run build
```

`npm ci` installs the lockfile exactly. The static site is `frontend/dist`. Publish `index.html` and the `assets` folder from that directory. Do not publish `frontend/main.js` by itself: the browser cannot resolve its `genlayer-js` import.

Studionet does not expose `sim_getFeeConfig`, so the page stays on `genlayer-js@1.1.8` and sends writes without a fee distribution.

## Contract methods

- `verify(rule, evidence_url)` appends one case for `gl.message.sender_address`
- `get_case(case_id)` returns that case, including the caller
- `get_my_case_ids()` returns the connected wallet's case ids, oldest first
- `get_case_count()` returns how many cases exist

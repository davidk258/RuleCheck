# RuleCheck

A one-page app that asks a GenLayer Intelligent Contract whether a public webpage satisfies a rule.

The contract fetches the page with `gl.nondet.web.render` and judges it with `gl.nondet.exec_prompt` inside `gl.eq_principle.prompt_comparative`. The latest finalized verdict is stored on the contract. No off-chain model is used.

## Deployed contract

Checked against Studio Explorer, not assumed:

- Network: Studionet, chain id `61999`
- Address: `0x841Dc93f665AD1fe32A1d026dFcD250ed1515a13`
- Deploy tx: `0x6859b72cb268fdd62133e05a88cee8983b2afbb8233d4765e41d78316e722a1a`
- Status: `FINALIZED`, leader execution `SUCCESS`
- The deployed source contains `class RuleCheck` and `def verify`

The frontend build was compiled locally. It has not been published.

## Files

```text
contracts/rule_check.py
frontend/
```

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

`genlayer-js` is pinned to `1.1.8`. Studionet does not expose `sim_getFeeConfig`, so the v2 fee estimator is not used. Writes are sent without a fee distribution.

Paste is unnecessary: the deployed address is already in the page. Connect a wallet on Studionet, enter a rule and `https://example.com/`, then click Verify. The page stays on `pending` until `waitForTransactionReceipt` reaches `FINALIZED`, then reads `get_result`.

## Test

PASS:

- rule: `The page says this domain is for use in documentation examples.`
- evidence URL: `https://example.com/`

FAIL, same URL:

- rule: `The page must sell live concert tickets.`

Do not use `https://test.com`. An earlier similar call on Studionet finalized with `exit_code 1` and saved nothing. An empty rule or a non-http URL must revert with `UserError`.

## Publish

Upload the source without `node_modules`. On Vercel set the root directory to `frontend`, the framework to Vite, the build command to `npm run build`, and the output directory to `dist`.

## GenLayer Projects checklist

- [ ] Contract source matches `0x841Dc93f665AD1fe32A1d026dFcD250ed1515a13`
- [ ] Deploy tx `0x6859b72cb268fdd62133e05a88cee8983b2afbb8233d4765e41d78316e722a1a` is included
- [ ] A finalized PASS `verify` and a finalized FAIL `verify` are included
- [ ] The public app URL is included after Vercel deploy
- [ ] The writeup does not call the frontend deployed before that URL exists

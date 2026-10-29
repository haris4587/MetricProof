# MetricProof

**Verify whether published statistics match their immutable source data.**

MetricProof combines independent GenLayer AI interpretation with exact integer arithmetic. A revenue claim can sound plausible while using the wrong denominator, exaggerating growth, or presenting a misleading chart. MetricProof locks the original evidence and claim, checks their meaning, and records a reproducible verification receipt.

- Website: https://metricproof.keenbasil9.chatgpt.site
- Contract source: [`contracts/metric_proof.py`](contracts/metric_proof.py)
- Contract: [`0x5a9E1836E6734dc0981192a3582b26D02a4743b1`](https://explorer-studio.genlayer.com/address/0x5a9E1836E6734dc0981192a3582b26D02a4743b1)
- Deployment: [`0x475d4300…f7da255`](https://explorer-studio.genlayer.com/tx/0x475d4300eb9a24df21ca0ac80764817d1bc18e7ca25cb44dfe1a954f1f7da255)
- Network: **Studionet, chain 61999**. Development sandbox; state may reset. No mainnet claim.

## The trust problem

A report claims **45% revenue growth**. Committed sales total $100,000 in 2024 and $118,000 in 2025. MetricProof computes `(118000 − 100000) × 100 / 100000 = 18%` and records the exact fraction and source hash. AI checks that the prose actually describes the locked calculation and scope, independently of whether its reported number is correct.

## Supported verification

- `TOTAL`: sum of category rows in the target period.
- `AVERAGE`: unweighted arithmetic mean of those rows.
- `SHARE`: selected category / period total × 100.
- `GROWTH`: (target − baseline) / baseline × 100, requiring identical category cohorts.
- Declared bar charts: nonzero baselines, clipped row values and unit mismatches.

Nonnegative integer dataset base units and reported thousandths (`45%` → `45000`) avoid floating point. Exact fractions allow half a displayed thousandth of rounding. A zero denominator is inconclusive. Bar chart definitions describe individual row values in selected periods, not aggregated totals. This version does not analyze image pixels, arbitrary scripts, PDFs, CSV or spreadsheets.

| Verdict | Rule in precedence order |
|---|---|
| `INCONCLUSIVE` | Source retrieval/integrity failure, undefined arithmetic, invalid AI output, or unknown meaning/framing. |
| `INCORRECT` | Reported number is outside the rounding interval. |
| `MISLEADING` | Number matches but meaning/framing or a declared chart check fails. |
| `ACCURATE` | All required checks pass. |

## Evidence and independent consensus

Original JSON bytes are stored on-chain and hashed by the contract. Optional external sources must be HTTPS raw GitHub URLs pinned to a full 40-hex commit. Each validator independently retrieves and matches **exact bytes** against the on-chain snapshot. Authoritative-source snapshots can be registered with explicit provenance, while live data changes do not rewrite a past receipt.

AI assesses metric, unit, aggregation, period, baseline, population, category and framing. It returns bounded enums and an exact claim/caption quote; it does not calculate, select rows or choose a verdict. Validators independently repeat the work and must agree on all decision-critical fields. The contract recomputes arithmetic outside nondeterministic execution before writing a receipt.

A hash authenticates the bytes, **not publisher identity, provenance assertions, completeness or real-world truth**. Examples are explicitly synthetic. AI and consensus remain fallible. This is not a financial audit or investment recommendation.

## Use the website

1. Inspect the fixture or upload schema-compatible JSON (up to 100 rows / 24,000 bytes).
2. Enter the published claim, operation, selectors, reported value and optional bar-chart definition.
3. Choose a signing mode: **Studio built-in account** uses the exact-call handoff; import the deployed address in [Studio](https://studio.genlayer.com), execute the prepared methods and return the claim ID to the website registry. **Direct website** creates a disposable browser test account; keep the page open.
4. Register dataset → submit claim → verify. The website reuses an existing dataset, tracks transactions, then reads the contract receipt.
5. Download or copy the source snapshot, immutable spec, calculation, hashes and network binding as JSON.

The contract was deployed through Studio's built-in account. Studio currently has no cross-origin wallet connector or UI key-export control. The website provides an explicit Studio signing handoff and a **separate** ephemeral browser signer using official `genlayer-js` local accounts. It does not claim that signer is the Studio account. No MetaMask, key import, backend signer or funded wallet is needed. Browser keys stay in memory only and are lost on reload. Only the claim submitter can verify or retry, so keep the same account throughout.

Accepted transactions are provisional until finalized. Timeouts preserve submitted hashes and never mean submission failed. There is no automatic resubmission. Check transaction activity before sending another write. Registration and review are separate transactions; later failures cannot erase earlier committed steps. Public reads need no account.

## Contract API and security

- `register_dataset(raw_json, immutable_url) → dataset_id`
- `submit_claim(dataset_id, spec_json) → case_id`
- `verify(case_id) → receipt_hash`
- Views: `get_policy`, `get_dataset`, `get_case`, `get_receipt`, `list_cases(offset)` (20 per page).

Datasets deduplicate by exact byte hash. Claim IDs bind the dataset, spec, submitter, contract, chain and policy hash. Receipts form an append-only hash chain. Only submitters can consume review attempts; inconclusive cases allow at most three attempts, while conclusive outcomes cannot be overwritten. No admin override or financial transfers exist.

Strict bounded input validation rejects duplicate JSON keys, extra fields, floats, booleans used as integers, unsafe URLs, duplicate period/category rows, and mismatched growth cohorts. All evidence is public: never upload confidential or personal data. Browser inputs are limited to safe JavaScript integers; the contract supports larger bounded integers via direct tooling.

## Development and checks

Node 22+ and Python 3.12+:

```sh
npm ci
python -m pip install -r requirements-dev.txt
genvm-lint check contracts/metric_proof.py
python -m pytest -p no:gltest tests/test_contract.py tests/test_receipts.py -q
npm test
npm run build
npm run dev
```

Pinned `genlayer-js` 1.1.8 and the full Python runner hash in the contract header match the target Studio runtime. A newer runner notification is not a reason to change an already verified deployment. Direct tests use real GenLayer VM/storage with mocked AI/web responses; live consensus evidence is documented separately.

`genlayer-test` 0.29.2 may request a missing universal release asset. Reuse the matching archive fetched by `genvm-lint check`, copying `~/.cache/genvm-linter/genvm-universal-<version>.tar.xz` into `~/.cache/gltest-direct/`. Keep the exact filename. `-p no:gltest` disables the unrelated network pytest plugin while retaining the direct-mode plugin.

## Roadmap

Signed issuer attestations, richer deterministic dimension filters, weighted averages, audited CSV ingestion, authoritative-source adapters and chart pixel binding. These are future work, not current features. New policies require explicit versioning and runtime tests.

Independent project. No official GenLayer or Project Explorer endorsement implied. MIT licensed.

## Verification evidence

See [live evidence](docs/evidence/) for finalized transaction summaries, bound receipts and the byte-for-byte deployed source check. Run `python scripts/verify_receipt.py <downloaded-receipt.json>` to verify dataset, policy, claim and receipt-chain hashes offline. This checks integrity, not network finality.

A deliberately ambiguous prose claim produced validator disagreement. It is preserved as a failed consensus transaction, not reported as an on-chain `INCONCLUSIVE` receipt. The frontend requires both majority agreement and successful execution, including after finalization. The zero-baseline example demonstrates the separate deterministic `INCONCLUSIVE` path.

Studio signing handoff canonicalizes JSON to a single line because Studio string inputs strip line breaks. Its export shows original and derived hashes, and omits the external URL if bytes changed. Use direct website signing to preserve exact uploaded bytes and verify their pinned URL.

Known availability boundary: dataset IDs deduplicate exact bytes globally; the optional source URL is set by the first registration and cannot be replaced. A missing or maliciously registered source can therefore prevent a conclusive review for that dataset ID. It cannot create an accurate certificate. Independent source-channel registration is future work.

# MetricProof — Project Explorer submission

## Identity

**Project name:** MetricProof

**Short summary:** Verify published KPI claims against immutable source data using GenLayer AI consensus and exact arithmetic.

**Website:** https://metricproof.keenbasil9.chatgpt.site

**Repository:** https://github.com/haris4587/MetricProof

**Logo:** [512 × 512 PNG](../public/MetricProof-logo.png)

**Suggested topics:** data verification, analytics, AI consensus. Choose the closest options available in the portal; these are descriptions, not a verified portal tag taxonomy.

## Project description

MetricProof checks whether published statistics actually match their committed source data. Users register immutable JSON datasets, lock KPI claims and declared bar-chart definitions, then request an independent GenLayer review. Validators authenticate any linked version-pinned source, interpret the claim's metric, scope and comparison, and agree on decision-critical findings. Deterministic integer arithmetic recalculates totals, averages, shares and growth.

The contract records ACCURATE, MISLEADING, INCORRECT or INCONCLUSIVE under explicit rules. A claim of 45% revenue growth against data showing 18% produces an INCORRECT receipt; a numerically correct claim with a truncated bar axis produces MISLEADING. Undefined calculations and unverifiable evidence cannot produce a positive certificate.

The integrated website supports registration, submission, consensus tracking, public record lookup, and downloadable verification receipts. Receipts bind dataset, policy, claim, contract and chain, with a local hash check and an offline verification script. The project is a Studionet development application, not a mainnet financial audit or certification of issuer identity.

## Why GenLayer is essential

Arithmetic alone cannot tell whether a report quietly changes the population, describes revenue as profit, implies causation, or presents an unsupported comparison. MetricProof uses independent AI interpretation for these semantic questions while keeping calculations and final verdict derivation deterministic. Validators independently repeat the assessment rather than trusting a single model's narrative.

## How reviewers can try it

1. Open the website and inspect the synthetic revenue fixture.
2. Select the 45% growth example, the correct 18% example, the truncated bar-chart example or the zero-baseline example.
3. Choose Studio signing handoff for Studio's built-in account, or create a disposable browser test account for direct website writes.
4. Register → submit → verify; inspect the transaction history and receipt.
5. Download the receipt or copy its JSON. Run `python scripts/verify_receipt.py receipt.json` to check its full integrity bindings offline.
6. Open the registry to inspect existing cases without an account.

Studio has no cross-site wallet connector. The Studio handoff and browser signer are explicitly different modes; neither uses MetaMask. The contract was deployed and its first full verification executed with Studio's built-in account.

## Deployment

- Network: Studionet, chain 61999.
- Contract: `0x5a9E1836E6734dc0981192a3582b26D02a4743b1`.
- Contract source: `contracts/metric_proof.py`.
- [Contract explorer](https://explorer-studio.genlayer.com/address/0x5a9E1836E6734dc0981192a3582b26D02a4743b1).
- [Finalized deployment](https://explorer-studio.genlayer.com/tx/0x475d4300eb9a24df21ca0ac80764817d1bc18e7ca25cb44dfe1a954f1f7da255).
- [Finalized built-in-account verification](https://explorer-studio.genlayer.com/tx/0xf342cda706f6653892a622729f1a9cc8651074bb12a0cf6b0519e4070b2a66f2).
- [Byte-for-byte deployed source binding](evidence/source-binding.json).

## Evidence and validation

[Verification report](VERIFICATION.md) lists the checks actually performed and distinguishes local mocked tests from live consensus evidence. [Evidence directory](evidence/) contains transaction summaries and full verification bundles. [GitHub Actions](https://github.com/haris4587/MetricProof/actions) runs the contract, receipt, frontend lifecycle and production-build checks.

A deliberately vague prose claim failed consensus; it is retained as failure evidence rather than advertised as a successful verdict. The website requires majority agreement as well as successful execution, even when the transaction is finalized. The zero-baseline example covers the deterministic inconclusive path separately.

## Boundaries and continued development

Accuracy is relative to locked evidence. Hashes authenticate bytes, not publisher identity, completeness or real-world truth. Examples are synthetic. Declared bar-chart definitions are checked; arbitrary chart images/scripts are not. Public Studionet state can reset. AI consensus can fail or be wrong. See README for the first-registration source-availability boundary.

Next work: independent source channels, signed issuer attestations, authoritative-source adapters, richer deterministic filters, weighted averages and chart pixel binding. These are roadmap items, not shipped features.

This document prepares a submission. It does not mean the project has been submitted or approved.

## Representative live review transactions

- [INCORRECT](https://explorer-studio.genlayer.com/tx/0xb279a0f3b2b1cd1a1f0c055799289a68d2a29f9bb8067ba6b28ab9afd9f0eea7)
- [ACCURATE](https://explorer-studio.genlayer.com/tx/0xf77242f50909956a9269981ca6f6562d4aa586dd37c6df01c0c592c701408a05)
- [MISLEADING](https://explorer-studio.genlayer.com/tx/0x1799c93294f57f9ff6dce0060ea9cff6cf3a101396cd65cd1ad4b08d16d6bed9)
- [INCONCLUSIVE](https://explorer-studio.genlayer.com/tx/0x91ce26cde009102c7cb25227e013bd57892260866170bccdc36bb9d9adc76a77)

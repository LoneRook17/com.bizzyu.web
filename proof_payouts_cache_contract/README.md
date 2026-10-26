# proof_payouts_cache_contract

Browser proof capture for the Payouts cache contract (computing → preparing → ready, CSV export).

**2026-10-26 (audit wave 1, F01):** the captured export
`bizzy-payouts-2026-07-14-to-2026-07-28.csv` was removed from the tree — it was a
real payouts export (1,480 rows with buyer emails, order ids and payment-intent ids).
`RESULT.json` still records its filename and line count as the proof of the download;
the file itself is not needed by any test (`payouts-cache-contract.test.ts` builds its
own in-memory responses). The blob remains in git history until a history rewrite is
authorised. A test (`src/lib/no-real-payout-exports.test.ts`) now fails the suite if a
real-looking payouts export is tracked anywhere in the repo again.

The three PNGs show only payout totals and truncated `po_…` ids for a smoke-test
business account — no buyer data.

# Validation record

Executed 16 September 2026. These are software checks against synthetic fixtures, not clinical validation.

| Check | Result | Scope |
|---|---|---|
| TypeScript | Passed | Application, APIs, tests |
| Unit and adversarial tests | 36 passed | Exact pairing, normalization, uncertain identifiers, source scope, CSV, workflow gates, history |
| Public Firebase browser suite | 12 passed, 1 legacy test skipped | Full response/export flow, imports/corrections, PDF extraction, Firebase account creation, sign-in and persistence, stale writes, mobile navigation, WebMCP shim, accessibility |
| Local built-Worker API checks | 7 passed | Anonymous denial, per-account isolation, cross-account mutation denial, revision/origin/actor checks |
| Production build | Passed | Firebase SPA, Cloud Run API, standalone AI worker and WASM |
| Actual browser AI | Executed | Quantized pinned MiniLM on twelve hand-written descriptions |
| Artifacts | Visually inspected | One-page PDF, representative code-listing pages, seven-slide deck, mobile/desktop UI and recorded walkthrough |

The browser accessibility check used axe WCAG 2 A/AA rules on the dashboard and review; no violations were reported on those screens. This does not establish whole-product accessibility or replace assistive-technology testing. The mobile test uses a 390-pixel viewport. WebMCP was tested through a feature shim, not a native browser-agent integration.

The public Firebase suite uses real disposable Firebase identities. It verifies private account isolation, saved changes after reload, sign-out, stale-write conflict rejection, origin checks, invalid-token rejection, actor-field forgery rejection and uncertain-item completion gates. A simulated first workspace GET failure verifies the retry-only state. The legacy local Worker checks remain historical regression evidence.

## AI evidence

See `ai-evaluation.json` and `AI-MODEL-CARD.md`. On one synthetic query with six relevant descriptions among twelve, semantic top-six recall was 5/6, versus 4/6 for a simple lexical baseline. The top six included a distractor. At the chosen 0.30 threshold, five relevant items and no distractors were surfaced in this tiny set. One plausible alias was missed. This is a smoke test; its labels and threshold are not independently adjudicated, and it is not a held-out benchmark or medical accuracy claim.

## Reproduce

Install with `npm ci`, then run `npm run typecheck`, `npm test`, `npm run build:firebase` and `npm run build:api`. Install Playwright Chromium. Run `LOTLIGHT_FIREBASE=1 LOTLIGHT_TEST_URL=https://lotlight-care.web.app npm run test:e2e` for release checks. The suite creates disposable test accounts and deletes their auth identities. `scripts/evaluate-ai.mjs` runs the real model and requires network access for the initial public model download.

## Review-driven fixes

An independent AI reviewer challenged the implementation using the hackathon rubric. This prompted stricter single-line scope evidence, rejection of qualified all-lot statements, visibility of manufacturer discrepancies, source/inventory snapshots, single-line inventory correction, export provenance, form reset, and historical-action labeling fixes. The final old-item-ID regression assertion passes after inventory replacement. See `JUDGING-REVIEW.md`.

Remaining release limits are in `SECURITY.md`. No clinic pilot, measured time saving, clinical outcomes, shared organization roles, automatic recall monitoring, OCR or independent verification of staff evidence is claimed.

The Firebase migration review also caught malformed quoted CSV suffixes, duplicate stock created by correction, empty parsed lot lists, initial account-load failure states, and configuration bootstrap failure. Regression checks cover these cases.

Final dependency audit: `npm audit` reports zero known vulnerabilities after compatible runtime updates and targeted transitive overrides. TypeScript, Firebase/API builds and the legacy build passed. The deployed API rejects a deleted account's previously issued token; configuration-outage recovery is browser-tested.

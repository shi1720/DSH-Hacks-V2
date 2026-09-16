# Validation record

Executed 16 September 2026. These are software checks against synthetic fixtures, not clinical validation.

| Check | Result | Scope |
|---|---|---|
| TypeScript | Passed | Application, APIs, tests |
| Unit and adversarial tests | 33 passed | Exact pairing, normalization, uncertain identifiers, source scope, CSV, workflow gates, history |
| Browser suite | 8 passed | Full response/export flow, imports/corrections, PDF extraction, development sign-in and persistence, stale writes, mobile navigation, WebMCP shim, accessibility |
| Local built-Worker API checks | 7 passed | Anonymous denial, per-account isolation, cross-account mutation denial, revision/origin/actor checks |
| Production build | Passed | Worker, client assets, standalone AI worker and WASM |
| Actual browser AI | Executed | Quantized pinned MiniLM on twelve hand-written descriptions |
| Artifacts | Visually inspected | One-page PDF, representative code-listing pages, seven-slide deck, mobile/desktop UI and recorded walkthrough |

The browser accessibility check used axe WCAG 2 A/AA rules on the dashboard and review; no violations were reported on those screens. This does not establish whole-product accessibility or replace assistive-technology testing. The mobile test uses a 390-pixel viewport. WebMCP was tested through a feature shim, not a native browser-agent integration.

The API suite uses two test identities injected into a local built Worker on loopback. It verifies application isolation, not the external authentication gateway. Hosted OAuth and gateway header stripping require separate review. The app's development-only login is not production authentication.

## AI evidence

See `ai-evaluation.json` and `AI-MODEL-CARD.md`. On one synthetic query with six relevant descriptions among twelve, semantic top-six recall was 5/6, versus 4/6 for a simple lexical baseline. The top six included a distractor. At the chosen 0.30 threshold, five relevant items and no distractors were surfaced in this tiny set. One plausible alias was missed. This is a smoke test; its labels and threshold are not independently adjudicated, and it is not a held-out benchmark or medical accuracy claim.

## Reproduce

Follow the root README to install, build, migrate the local D1 database, and start the development server. Run `npm run typecheck`, `npm test`, then `LOTLIGHT_TEST_URL=http://localhost:5173 npm run test:e2e` using the actual server port. Install Playwright Chromium first. `scripts/evaluate-ai.mjs` executes the real browser model and requires a network connection for the initial public model download. `scripts/check-api-isolation.mjs` targets the separate built Worker at port 5185 by default; never target a real clinic workspace.

## Review-driven fixes

An independent AI reviewer challenged the implementation using the hackathon rubric. This prompted stricter single-line scope evidence, rejection of qualified all-lot statements, visibility of manufacturer discrepancies, source/inventory snapshots, single-line inventory correction, export provenance, form reset, and historical-action labeling fixes. The final old-item-ID regression assertion passes after inventory replacement. See `JUDGING-REVIEW.md`.

Remaining release limits are in `SECURITY.md`. No clinic pilot, measured time saving, clinical outcomes, shared organization roles, automatic recall monitoring, OCR or independent verification of staff evidence is claimed.

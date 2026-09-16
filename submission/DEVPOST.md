# Lotlight

## Tagline
A recall notice reaches the inbox. Lotlight helps the response reach the shelf.

## Inspiration
A published recall still leaves a practical job unfinished: someone must compare product and lot identifiers with the clinic's stock, find missing labels, take the manufacturer-specified response, and keep evidence. That last mile is easy to underestimate when designing AI for healthcare.

Lotlight focuses on that operational gap. The demonstration follows fictional Willow Community Clinic through a historical Baxter notice. It is a synthetic story grounded in real, linked manufacturer identifiers, not a claim about a real patient or clinic.

## What it does
Lotlight turns a recall notice and an inventory CSV into a source-linked review. Every stock line shows why it matches, why it needs information, or why its identifiers are not listed in the entered scope. “Not listed” never means “safe.”

A local AI model helps find product aliases, such as differently worded IV tubing descriptions. Deterministic rules preserve manufacturer, catalog and lot relationships. A human checks the source before assigning a response. Completion requires physical-label verification, all recorded units handled, and a staff-recorded evidence reference. Unknown identifiers stay open.

Signed-in users have a private saved workspace. Source revisions and inventory changes preserve history, and optimistic concurrency protects against silent overwrites. Teams can export the resulting record as JSON, CSV or a printable PDF report. The MVP has individual accounts; shared clinic roles are future work.

## How we built it
React and Vinext power the interface. Cloudflare Workers and D1 provide server routes and per-account persistence. The app uses strict command validation with Zod and parameterized database operations. PDF.js extracts text from digital PDFs; scanned PDFs need a verified transcription.

A pinned quantized MiniLM model runs through Transformers.js and ONNX/WASM in a browser worker. There is no paid inference API or API key. The model ranks descriptions; it cannot generate recalled identifiers, override exact mismatches or approve actions. The conservative matcher accepts explicitly paired catalog/lot scope and rejects unsupported conditional scope.

## Challenges
The difficult part was deciding when the software should abstain. Manufacturer variations, missing lots, mixed catalog tables, source changes and partial quantities all produce tempting shortcuts. We used explicit uncertainty and source-version checks instead.

Independent AI-assisted review exposed a cross-product pairing weakness and inadequate historical snapshots. We tightened supported scope, retained revision snapshots, and added regression tests. The browser worker also needed its own isolated build to avoid development-runtime code in the AI execution context.

## Accomplishments
A working source-to-inventory-to-response workflow with real browser inference, private persistence, reviewed evidence, reversible record corrections and portable audit exports. The project includes adversarial automated tests, browser workflow checks, a clear model card, and explicit limitations.

Use the exact final validation counts in docs/VALIDATION.md. These tests are software checks on synthetic data, not clinical validation.

## What we learned
Healthcare AI can be useful without making a diagnosis or inventing instructions. Good uncertainty handling is a product feature. The value of a similarity model is finding candidates for a reviewer, not lending a false appearance of certainty.

## What's next
Validate the job with three independent clinics, measure review time and identifier errors, and test willingness to pay. The proposed price is $149/site/month, an unvalidated hypothesis. At an assumed $30/hour labor cost, five hours saved would cover the fee. Enterprise competitors already exist; Lotlight's proposed entry point is clinics with spreadsheet workflows.

Before clinical operations: shared clinic roles, operational security review, domain-expert validation, complex source formats, and institution-approved data handling. No existing customers, clinical efficacy, supplier integrations or complete recall-monitoring coverage are claimed.

## Built with
TypeScript, React, Vinext, Cloudflare Workers, Cloudflare D1, Transformers.js, MiniLM, ONNX Runtime Web, PDF.js, Zod, Radix UI, Lucide, Playwright.

## Attribution
Project creator and submission owner: **Shivam Gupta**. AI tools assisted research, design, implementation, testing, independent review and presentation preparation. Describe any personal revisions and final presentation work accurately at submission. No fictional human contributions, interviews or outcomes should be added.

## Links
Repository: https://github.com/shi1720/DSH-Hacks-V2
One-page description: upload `Lotlight-One-Page.pdf`.
Video: upload the final narrated recording and paste its accessible URL.
Hosted app: use the successfully deployed URL from the final handoff; verify judge access in an incognito browser before submitting.

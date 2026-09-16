# Security and intended use

Lotlight is a hackathon decision-support MVP for equipment and supply records. Do not enter patient information. It is not a medical device safety certification, official alerting service, regulatory compliance certification, or a substitute for complete current manufacturer instructions.

## Implemented boundaries

- Firebase Authentication provides email/password identities. The API verifies ID tokens, rejects disabled/deleted/revoked accounts, and derives storage paths from their user IDs. User-supplied actor fields cannot override server-derived attribution.
- Firestore client rules deny all direct access. A dedicated Cloud Run service identity has database access. Each transaction reads only the verified user's document.
- Commands use strict Zod schemas. Transactional revision checks reject stale writes. POST requires an allowed Origin and JSON content type; authentication remains the actual authorization boundary.
- Inventory and notice text is rendered as text. Source links require HTTPS. The API never fetches arbitrary source URLs.
- Inventory imports are limited to 500 KB and 500 rows. Notices are limited to 5 MB, 20 PDF pages and 50,000 extracted characters. API requests are limited to 600 KB. Compressed Firestore records are limited to 900 KB and decompressed data to 3 MB.
- The API allows 90 workspace requests per user per minute per process. Cloud Run is capped at one instance and scales to zero. This is a cost guardrail, not a distributed abuse-prevention system.
- Anonymous demo state lives in memory and does not transfer on sign-in. Signed-in workspaces are saved in Firestore. Browser AI downloads public model files but does not send descriptions to an inference provider.
- CSV exports neutralize spreadsheet formulas. Source and inventory changes preserve history; changed lines require fresh review.
- Completion requires reviewed scope, exact current identifiers, physical-label verification, all recorded quantities handled and an evidence reference. These remain staff attestations.
- Configuration and saved-workspace failures show retry states. A failed initial account load never presents a synthetic workspace as saved account data.

## Deployment

Firebase Hosting serves the static app. A separate Cloud Run service verifies Firebase identity before accessing Firestore. The browser Firebase configuration is public by design; it does not grant database access. No OpenAI secret is used by the application or included in source. The optional narration scripts read OPENAI_API_KEY only from the environment.

The legacy Sites implementation remains in the repository for reference. Its gateway header assumptions do not apply to the Firebase release. Never expose the legacy Worker without its trusted gateway.

## Before a real clinic pilot

Still needed: shared organization permissions, account and workspace deletion UI, operational retention and backup policies, monitoring and alerting, email-verification policy, stronger abuse controls, domain-expert source review, independently evaluated recall scope, and institution-approved data handling. There is no OCR, complex serial/kit/range exception engine, supplier integration or current recall coverage guarantee. No clinical validation or immutable external audit store is claimed.

Open a repository issue with a non-sensitive reproduction to report a defect. Never include credentials, patient information or identifiable clinic inventory.

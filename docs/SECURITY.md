# Security and intended use

Lotlight is a hackathon decision-support MVP for equipment/supply records. Do not enter patient information. It is not a medical device safety certification, official alerting service, regulatory compliance certification, or a substitute for complete current manufacturer instructions.

## Implemented boundaries

- Hosted identity comes from the trusted Sites dispatcher. Owner IDs, timestamps, approval actors, match statuses and workflow revisions are derived server-side.
- Every query selects by the signed-in user. APIs reject missing identity. Mutations require same-origin JSON requests and validate commands with strict Zod schemas.
- Prepared SQL avoids string interpolation; a compare-and-swap revision update rejects concurrent overwrites.
- Rendering treats notice and inventory content as text. User source URLs must be HTTPS. The server does not fetch arbitrary notice URLs.
- Upload limits: inventory 500 KB / 500 rows; notices 5 MB / 20 pages / 50,000 extracted characters. Requests and persisted workspaces are bounded. Evidence and fields have length limits.
- CSV exports escape quotes and neutralize formula prefixes. Anonymous demo records never persist; account records are stored in D1.
- Source and inventory edits preserve historical snapshots. Editing one inventory line invalidates that line's prior response, not unaffected lines. Full replacement creates new item IDs.
- Response completion requires approved scope, exact current identifiers, physical-label verification, all recorded units handled, and an evidence reference. These are staff attestations, not independently verified truth.

## Deployment trust boundary

The app assumes Sites strips and injects `oai-authenticated-user-*` headers. Direct public exposure of the underlying Worker with arbitrary client headers would defeat this assumption. A standalone deployment must replace this with authenticated session verification or an equivalent trusted gateway. The development mock only applies to loopback development and is absent from production output.

## Not yet production-complete

No shared organization permissions, MFA policy administration, immutable external audit store, backup/restore UI, retention automation, upload malware scanning, full OCR, serial-range/kit/packaging exception engine, supplier integrations, current recall coverage guarantee, or clinical validation. Platform access and backups require operational review before a real pilot. The dependency stack includes beta Vinext and should be assessed before clinical deployment.

A clinic pilot needs manufacturer/source confirmation, domain expert review of scope, institution-approved data handling, role/access design, usability testing and monitoring. Do not put this MVP into unsupervised clinical operations.

## Reporting a vulnerability

Open a repository issue with a non-sensitive reproduction. Do not include credentials, real patient data, or identifiable clinic inventory. For deployment access problems contact the project owner, Shivam Gupta.

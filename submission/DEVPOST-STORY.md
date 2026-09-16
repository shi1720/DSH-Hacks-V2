## Inspiration

A recall letter can arrive in seconds. Finding every affected item on a clinic's shelves is a different job.

Imagine a stock coordinator comparing that letter with a spreadsheet. One product has a different name. Another has no lot number. The letter is clear, but the next step is not: which items need attention, who will check them, and how will the clinic record what happened?

That unfinished handoff inspired Lotlight. We chose a specific healthcare operations problem where useful AI could support an accountable process without pretending to make clinical decisions.

Our demonstration uses a real historical Baxter notice and a fictional clinic. The stock, staff actions, and evidence references are synthetic. It is a scenario built to make the problem tangible, not a claim about a real clinic.

## What it does

Lotlight connects three things that are often separate: the source notice, the stock record, and the response.

1. **Bring the source.** Import a text-based PDF or paste a notice. Preserve the wording, its original link, and explicit catalog-to-lot pairs for review.
2. **Reconcile the shelf.** Import an inventory CSV. Exact checks compare manufacturer, catalog, and lot identifiers. Browser AI compares product descriptions to help prioritize possible aliases.
3. **Resolve the unknowns.** A missing lot number stays open. A staff member can check the physical label and correct that stock line without resetting unrelated responses.
4. **Document the response.** Confirm the source, assign an owner, record verification, and track handled quantities and evidence. Completion requires all recorded units to be handled.
5. **Keep the record.** Signed-in users have private saved workspaces. Export a JSON audit record, a review spreadsheet, or a printable report.

The AI cannot approve a source, invent a lot number, or declare an item safe. The original manufacturer instructions and human review control the response.

## How we built it

We built the interface in React and TypeScript, with a shared validation and reconciliation engine. Firebase Hosting provides the public app, Firebase Authentication supports email sign-in, and a Cloud Run API verifies identity before reading or updating private Firestore records.

A quantized MiniLM sentence transformer runs inside a browser worker. It compares descriptions on the device, while exact identifier rules determine whether stock matches the entered scope. The model downloads on first use; inventory descriptions are not sent to an AI inference API.

The workflow includes source and inventory versions, server-side command validation, and revision checks to prevent silent overwrites. We tested pairing errors, missing identifiers, malformed imports, response gates, persistence, exports, and browser interactions. Independent AI-assisted review helped us find edge cases and tighten the implementation.

Lotlight is a project by Shivam Gupta. AI tools assisted research, design, implementation, testing, and presentation preparation.

## Challenges we ran into

The hardest part was deciding when the software should refuse to make a conclusion.

A notice can contain several catalog numbers and several lots. Combining them carelessly creates false matches. We restricted extraction to explicit paired scope and kept supporting excerpts visible. Ranges, exceptions, scanned PDFs, and other unsupported formats require additional human work.

We also had to separate similar wording from reliable identity. “IV line extender” may resemble “extension set,” but that does not establish recall scope. AI helps prioritize review; it does not replace catalog and lot evidence.

Finally, a correction must not make an old response look current. Versioned records keep earlier work historical when its source or stock line changes.

## Accomplishments that we're proud of

We built a complete notice-to-response workflow with real browser inference, saved accounts, source review, individual stock corrections, evidence gates, and portable exports.

The most important moment in the demo is deliberately ordinary: a missing lot number stays unresolved. Once the physical record is corrected, the user can verify the item and document the response. The interface makes both progress and uncertainty visible.

We are also proud of the limits we made explicit. Our small synthetic AI smoke test revealed both a useful alias match and a missed description. We report that evidence without presenting it as clinical accuracy.

## What we learned

Healthcare software needs to explain what it knows, where that information came from, and what still needs a person.

We learned that a useful AI feature can be small. Comparing descriptions is helpful when it fits inside a reliable workflow with exact checks, clear ownership, and a record someone can inspect later.

We also learned that commercial viability begins with a specific buyer and an observable job. Our proposed first customer is an independent clinic working from spreadsheet stock records. Whether Lotlight saves enough staff time to justify a subscription remains a question to test with clinics, not a result we have already achieved.

## What's next for Lotlight

The next step is a supervised pilot with clinic operations staff using approved test records. We want to measure review time, unresolved-item handling, and whether the exported evidence is useful in their existing process.

Our initial pricing hypothesis is $149 per clinic per month. We would test willingness to pay against measured value and actual hosting, support, and onboarding costs before treating that as a business model.

Product priorities include shared clinic roles, broader independently reviewed notice examples, better source extraction, and integration with existing stock systems. Any expansion of recall coverage needs domain review and stronger evaluation.

Lotlight is a tested hackathon MVP. It is not clinically validated, a regulatory compliance certification, or ready for unsupervised clinical operations. We want to earn that trust through evidence.


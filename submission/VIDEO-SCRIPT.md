# Lotlight video script

**Read only the quoted narration aloud.** The screen recording is silent on purpose so Shivam can use his own voice. Aim for a calm, conversational 135-145 words per minute. The supplied walkthrough is approximately 3 minutes 5 seconds; adjust pauses or trim holds in your editor to match your delivery.

## 0:00-0:19 ;  Dashboard

“I'm Shivam Gupta, and this is Lotlight. A medical recall reaches a clinic's inbox. But who checks the shelves? Who follows up when a lot number is missing? And where is the evidence that someone finished the job? Lotlight connects the notice to a documented response.”

## 0:19-0:39 ;  Import inventory

“Meet Willow, our fictional community clinic. Its spreadsheet has eight stock lines across four locations. I can upload a CSV, validate every row, and preserve missing identifiers instead of quietly dropping them. All the inventory you see is synthetic.”

## 0:39-1:01 ;  Original source and approval

“This example uses two catalog-and-lot pairs from a real, historical Baxter manufacturer notice. The original source stays one click away. Each pair has its own supporting excerpt, so a lot from one product cannot silently transfer to another. Before anyone assigns a response, a person must check the source.”

## 1:01-1:19 ;  Run local AI and inspect alias

“Here is where AI helps. Our stockroom calls this an IV line extender. The notice uses different wording. A small language model compares those descriptions directly in the browser, without an API key. It flags a candidate for review. It cannot invent a catalog number or declare an item recalled.”

## 1:19-1:32 ;  Exact match evidence

“For this line, the manufacturer, catalog, and lot agree. Lotlight shows the reason and the source evidence. A similar product with a different identifier never becomes an exact match just because the AI thinks its name looks close.”

## 1:32-1:53 ;  Response form

“Now the review becomes owned work. I assign a coordinator and a due date, record the physical-label check, account for the units handled, and add a response reference. These are clearly marked demonstration records. In practice, the clinic must follow the full current manufacturer instructions.”

## 1:53-2:17 ;  Completion and unknown-item gate

“That response can now be recorded as complete. But watch the line with a missing lot: completion is disabled. Someone still has to find the label. Partial quantities stay open too. And correcting one inventory line creates a new revision without reopening unrelated, unchanged work.”

## 2:17-2:36 ;  Audit export and printable report

“The result travels with the team. Export the reviewed inventory, a readable report, or the full source and activity record. Earlier source and inventory versions remain available. This documents what staff recorded; it doesn't pretend to independently prove a device is safe.”

## 2:36-2:54 ;  Commercial hypothesis

“The first customer I want to test is an independent clinic still doing this work in spreadsheets. Our pricing hypothesis is a hundred and forty-nine dollars per site per month. At an assumed thirty-dollar hourly staff cost, five hours saved would cover it. That needs a real pilot, not a revenue claim.”

## 2:54-3:05 ;  Dashboard / closing

“Lotlight is a working MVP with tested safeguards and clear limits. My next step is supervised clinic validation. Because publishing a recall starts the process. A response someone can explain and finish closes the operational gap.”

## Recording and editing instructions

- Record in a quiet room with headphones disconnected from speakers. Use your natural voice; no synthetic impersonation is needed.
- Capture the narration separately, then place it over `Lotlight-Demo-Silent.mp4` in your editor.
- Use short pauses between sections. The supplied time ranges are an editing guide; natural delivery matters more than exact timing.
- Keep the on-screen historical/synthetic labels visible. Do not remove them to make the demo appear deployed in a real clinic.
- Add an optional 5-second face-camera introduction if desired, then trim an equivalent dashboard hold.
- Export at 1440x1000 or fit the capture into a 1920x1080 canvas. Use readable framing and avoid cropping identifiers.
- Before upload, watch the entire export once with sound. Confirm the text is readable and your narration matches the actions.
- If asked about AI: the model is MiniLM, its output is semantic similarity, and exact matching is deterministic. In a tiny synthetic smoke set it missed a plausible alias; this is not clinical accuracy evidence.

## 30-second backup pitch

“I'm Shivam Gupta. Lotlight helps small clinics turn a medical recall notice into a documented response. It compares the notice with spreadsheet stock, shows why each item matches, and keeps missing identifiers open. Browser-based AI helps find product aliases, while exact identifiers and human review control decisions. Staff assign an owner, verify the label, account for the units, and export the evidence. Our next step is a supervised clinic pilot to test time saved and matching errors.”

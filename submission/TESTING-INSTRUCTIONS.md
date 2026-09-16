**App:** https://lotlight-care.web.app

Use a current desktop browser for the full walkthrough. The app also supports mobile navigation. No patient information or real clinic inventory is needed.

### Quick demo, no account required

1. Open the app. The starting workspace contains eight synthetic inventory lines and two catalog/lot pairs from a historical Baxter notice. Anonymous changes are temporary and are lost on reload or sign-in.
2. Select **Open review**. Before running AI, expect **2 identifier matches**, **2 lines needing review**, and **4 not listed**. “Not listed” does not mean safe.
3. Select **Run local AI**. First use downloads the model and runtime, so allow time on a slower connection. The “IV line extender” row receives a similarity score for review. AI must not turn it into an exact identifier match.
4. Open **Source & scope**. Inspect the preserved text, source link, and paired scope. Confirm the training review checkbox, then select **Confirm source review**.
5. In **Inventory review**, expand the CLEARLINK extension set in the **Infusion room** and select **Assign response**. Enter a fictional responsible person, a due date, physical-label verification, and response evidence. There are **24 units** on this line. Marking the response complete should require all 24 units handled and sufficient verification and evidence text.
6. Expand the CLEARLINK extension set in the **Procedure room**. It has a missing lot number. **Verified** and **Completed** must remain unavailable while its identity is incomplete.
7. Open **Inventory**, find that Procedure room line, and select **Correct**. For this synthetic exercise, enter lot **R25C31031** and save. Return to the review. The corrected row should now be an identifier match, with a fresh response obligation. The unchanged Infusion room response should remain complete.
8. Open **Export record**. Download the complete JSON audit record, the inventory review CSV, and the readable report. Confirm that the record shows source provenance, synthetic inventory, and the staff actions you entered.
9. Optional: select **Import CSV** in Inventory and try a negative quantity or a missing required column. The app should reject the import and preserve your existing inventory. **Use synthetic example** provides a valid fixture.

### Saved-workspace test

1. Create an account or sign in using the app's email authentication. Use an email address and password you control. Start this step before making changes you want to keep; anonymous demo changes do not transfer automatically.
2. Confirm the source or save a response in the signed-in workspace, then reload the page. Your saved record should remain.
3. Sign out. Your private records should not appear in the anonymous demo. A separate account should receive its own workspace.
4. For a concurrency check, open your signed-in workspace in two tabs. Make a change in the first tab, then attempt a change from the stale second tab. The second tab should request a reload instead of silently overwriting the newer record.

### Boundaries to expect

- Only text-based PDFs are supported. Scanned documents need a verified transcription.
- Supported extraction uses explicit catalog/lot pairs. Ranges and exceptions require specialist review.
- AI is optional. Exact checks remain available if the model cannot load.
- Staff-entered evidence is an attestation, not independently verified proof.
- Do not use this demonstration for patient care or current recall decisions.


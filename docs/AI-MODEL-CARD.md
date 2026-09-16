# Lotlight AI model card

## Model and purpose

`Xenova/all-MiniLM-L6-v2`, Apache-2.0, revision `751bff37182d3f1213fa05d7196b954e230abad9`, q8 ONNX. Transformers.js runs feature extraction in a dedicated browser worker. Mean-pooled, normalized embeddings have 384 dimensions. Dot product gives cosine similarity.

The model compares product descriptions and ranks possible aliases. Input is bounded to 500 characters per description. It is not a medical model, regulatory reasoning system, or trained recall classifier. A similarity of 0.7 is not a 70% recall probability.

## Hard boundary

Only deterministic manufacturer/catalog/lot comparisons can yield an identifier match. AI cannot create identifiers, override a known mismatch, complete a response, or approve source scope. A configurable-in-code candidate threshold of 0.3 is an uncalibrated demonstration heuristic. It needs domain evaluation before a pilot. Failed downloads retain identifier matching with a visible AI-unavailable message.

## Data flow

First use downloads public weights and runtime assets. Inventory descriptions remain on the device for inference. The app itself persists signed-in inventory/source records in D1. No claim that all app data stays on the device is made. The model has not been fine-tuned on clinic records.

## Evaluation

See `docs/VALIDATION.md` and `docs/ai-evaluation.json` when present for actual measured smoke/ranking results. Synthetic examples only; they do not establish sensitivity, specificity, clinical safety or generalization. The deterministic adversarial suite is separate from semantic ranking quality.

## Limitations

Medical product abbreviations, language differences, short brand-specific labels and near-identical incompatible devices can confuse embeddings. Known catalog mismatches remain unlisted in the entered scope, not safe. Missing manufacturer identity with catalog agreement remains unresolved. Complex source conditions require specialist review rather than automated parsing.

The 0.3 candidate threshold was selected after inspecting the synthetic smoke examples. It is exploratory, not an independently calibrated operating point. The original 0.5 threshold missed several plausible aliases; lowering it only changes the human-review label and never changes exact matching.

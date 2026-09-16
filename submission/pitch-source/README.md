# Editable pitch and generation source

`../Lotlight-Pitch.pptx` has seven slides with editable text, speaker notes and source citations. The PDF is a rendered copy. The application screenshots are bitmap images.

The generators use the Codex bundled artifact-tool and presentation finalizer. Their skill/runtime paths are explicit near the top; update them for another environment. Run from the repository root with those runtime packages available to Node. The output defaults to `.artifact-build/pitch`; override with `PITCH_WORKSPACE`. Set `PITCH_REVISION=v4` for another revision. The finalizer intentionally does not overwrite final decks. Run `create-pdf.py v4` after inspecting the generated slides.

Source screenshots are in `docs/images`. No LibreOffice is required. Project creator: Shivam Gupta; AI-assisted research, development and artifact preparation.

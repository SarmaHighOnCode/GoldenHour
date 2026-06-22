# GoldenHour — CodeQuest 2026 Submission Deliverables

This folder holds the non-code deliverables for the Prototype / MVP round. The
source code itself lives in [`../backend`](../backend) and [`../frontend`](../frontend)
and is deployed live.

| Deliverable | File | Notes |
| --- | --- | --- |
| Technical documentation | `GoldenHour_Technical_Documentation.tex` / `.pdf` | LaTeX source (Overleaf-ready) + compiled PDF. |
| Presentation deck | `GoldenHour_Pitch_Deck.pptx` | 11-slide pitch deck, editable in PowerPoint / Google Slides. |
| Demo video | — | Produced separately (not in this repo). |

## Technical documentation (LaTeX → Overleaf)

`GoldenHour_Technical_Documentation.tex` compiles with **pdfLaTeX** and needs no
external assets (all diagrams are TikZ).

**On Overleaf:** create a new project, upload the `.tex`, set the compiler to
*pdfLaTeX*, and Recompile. `GoldenHour_Technical_Documentation.pdf` is the
already-compiled output (9 pages).

**Locally** (MiKTeX / TeX Live):

```bash
pdflatex GoldenHour_Technical_Documentation.tex
pdflatex GoldenHour_Technical_Documentation.tex   # second pass builds the ToC
```

## Presentation deck (PowerPoint)

`GoldenHour_Pitch_Deck.pptx` is generated programmatically with
[PptxGenJS](https://gitbrent.github.io/PptxGenJS/). To regenerate after editing
`deck-build/build.js`:

```bash
cd deck-build
npm install            # first time only (pptxgenjs, react-icons, sharp)
node build.js          # writes ../GoldenHour_Pitch_Deck.pptx
```

The deck is the source of truth in `.pptx`; edit slides directly in PowerPoint,
or change `build.js` and regenerate for a clean rebuild.

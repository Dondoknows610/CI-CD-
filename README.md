# CISSP Drill

Interactive multiple-choice practice quiz built from the uploaded CISSP question set.

## Features

- 386 multiple-choice questions (non-MC drag-and-drop items are skipped)
- Practice mode with instant feedback, or exam mode with end-of-set scoring
- Quiz lengths of 10 / 25 / 50 / all
- Keyboard shortcuts: `A`–`D` to answer, `Enter` for next
- Missed-question review on results

## Run locally

```bash
npm start
```

Then open [http://localhost:4173](http://localhost:4173).

## Regenerate questions from PDF

```bash
pip install pypdf
python3 scripts/extract_questions.py /path/to/CISSP_Questions.pdf -o public/questions.json
```

## Project layout

- `public/` — static quiz app (`index.html`, `styles.css`, `app.js`, `questions.json`)
- `scripts/extract_questions.py` — PDF → JSON extractor

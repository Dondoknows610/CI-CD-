#!/usr/bin/env python3
"""Extract CISSP multiple-choice questions from the source PDF into JSON."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from pypdf import PdfReader

NOISE_PATTERNS = [
    r"ISC CISSP Exam",
    r'"Pass Any Exam\. Any Time\." - www\.actualtests\.com\s*\d*',
    r"www\.actualtests\.com\s*\d*",
]


def extract_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    for pattern in NOISE_PATTERNS:
        text = re.sub(pattern, "", text)
    return text


def parse_questions(text: str) -> list[dict]:
    parts = re.split(r"QUESTION NO:\s*(\d+)\s*", text)
    questions: list[dict] = []

    for i in range(1, len(parts), 2):
        num = int(parts[i])
        body = parts[i + 1]

        answer_match = re.search(r"Answer:\s*([A-D])\s*", body)
        if not answer_match:
            # Skip non-MC items (e.g. drag-and-drop)
            continue

        answer = answer_match.group(1)
        body = body[: answer_match.start()].strip()
        option_parts = re.split(r"\n\s*([A-D])\.\s*\n?", body)
        stem = re.sub(r"\s+", " ", option_parts[0]).strip()

        options: dict[str, str] = {}
        for j in range(1, len(option_parts), 2):
            letter = option_parts[j]
            option_text = re.sub(r"\s+", " ", option_parts[j + 1]).strip()
            options[letter] = option_text

        if set(options) != {"A", "B", "C", "D"}:
            continue

        questions.append(
            {
                "id": num,
                "question": stem,
                "options": [
                    {"key": "A", "text": options["A"]},
                    {"key": "B", "text": options["B"]},
                    {"key": "C", "text": options["C"]},
                    {"key": "D", "text": options["D"]},
                ],
                "answer": answer,
            }
        )

    return questions


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path, help="Path to CISSP questions PDF")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("public/questions.json"),
        help="Output JSON path",
    )
    args = parser.parse_args()

    questions = parse_questions(extract_text(args.pdf))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(questions, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(questions)} questions to {args.output}")


if __name__ == "__main__":
    main()

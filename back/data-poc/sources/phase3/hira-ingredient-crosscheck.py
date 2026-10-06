#!/usr/bin/env python3
"""Compare the supplied HIRA sample's literal ingredient text with MFDS source text.

This is an exploratory exact-text check only. It does not create an identifier
mapping, normalize ingredient names, or interpret clinical equivalence.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Could not read JSON file: {path.name}.") from error
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path.name}.")
    return value


def load_hira_sample(sample_directory: Path) -> tuple[str, str, str, str]:
    xml_path = sample_directory / "response.xml"
    metadata_path = sample_directory / "metadata.json"
    metadata = read_json(metadata_path)
    if metadata.get("source") != "hira-ingredient-effect":
        raise ValueError("The HIRA metadata source marker did not match.")
    if metadata.get("captureOrigin") != "user-provided chat message":
        raise ValueError("Only the separately marked user-provided HIRA sample is accepted.")

    try:
        raw_xml = xml_path.read_bytes()
        root = ET.fromstring(raw_xml)
    except (OSError, ET.ParseError) as error:
        raise ValueError(f"Could not parse HIRA XML file: {xml_path.name}.") from error

    items = root.findall("./body/items/item")
    if len(items) != 1:
        raise ValueError(f"Expected one HIRA sample item, found {len(items)}.")
    general_name_code = (items[0].findtext("gnlNmCd") or "").strip()
    general_name = (items[0].findtext("gnlNm") or "").strip()
    if not general_name_code or not general_name:
        raise ValueError("The HIRA sample item is missing gnlNmCd or gnlNm.")

    return (
        general_name_code,
        general_name,
        hashlib.sha256(raw_xml).hexdigest(),
        str(metadata.get("captureOrigin")),
    )


def load_product_permit_rows(snapshot_directory: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    manifest_path = snapshot_directory / "snapshot-manifest.json"
    manifest = read_json(manifest_path)
    if manifest.get("source") != "product-permit" or manifest.get("complete") is not True:
        raise ValueError("A complete product-permit snapshot is required.")

    page_files = sorted(
        path
        for path in snapshot_directory.glob("page-*.json")
        if not path.name.endswith(".metadata.json")
    )
    expected_pages = manifest.get("pagesDownloaded")
    if not isinstance(expected_pages, int) or len(page_files) != expected_pages:
        raise ValueError("Product-permit page count did not match its manifest.")

    rows: list[dict[str, Any]] = []
    for expected_page, page_path in enumerate(page_files, start=1):
        page = read_json(page_path)
        header = page.get("header")
        body = page.get("body")
        if not isinstance(header, dict) or header.get("resultCode") != "00":
            raise ValueError(f"Product-permit page {expected_page} was not a successful response.")
        if not isinstance(body, dict) or body.get("pageNo") != expected_page:
            raise ValueError(f"Product-permit page {expected_page} did not match the expected page number.")
        items = body.get("items")
        if not isinstance(items, list) or any(not isinstance(item, dict) for item in items):
            raise ValueError(f"Product-permit page {expected_page} has an unexpected items shape.")
        rows.extend(items)

    expected_rows = manifest.get("downloadedRows")
    if len(rows) != expected_rows or len(rows) != manifest.get("totalCount"):
        raise ValueError("Product-permit rows did not match the complete snapshot manifest.")
    return manifest, rows


def build_report(snapshot_directory: Path, sample_directory: Path) -> dict[str, Any]:
    general_name_code, general_name, xml_sha256, capture_origin = load_hira_sample(sample_directory)
    manifest, rows = load_product_permit_rows(snapshot_directory)

    nonempty_ingredient_rows = 0
    literal_name_rows = 0
    exact_whole_field_rows = 0
    code_literal_rows = 0
    matching_item_ids: set[str] = set()
    for row in rows:
        ingredient_value = row.get("ITEM_INGR_NAME")
        if not isinstance(ingredient_value, str) or not ingredient_value.strip():
            continue
        nonempty_ingredient_rows += 1
        if general_name in ingredient_value:
            literal_name_rows += 1
            item_seq = row.get("ITEM_SEQ")
            if isinstance(item_seq, str) and item_seq:
                matching_item_ids.add(item_seq)
        if ingredient_value == general_name:
            exact_whole_field_rows += 1
        if general_name_code in ingredient_value:
            code_literal_rows += 1

    return {
        "schemaVersion": "1.0.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "method": "exact-literal-text-check-only",
        "sources": {
            "hiraSample": {
                "captureOrigin": capture_origin,
                "directory": sample_directory.name,
                "responseFile": "response.xml",
                "responseSha256": xml_sha256,
                "gnlNmCd": general_name_code,
                "gnlNm": general_name,
            },
            "mfdsProductPermit": {
                "directory": snapshot_directory.name,
                "capturedAt": manifest.get("capturedAt"),
                "pages": manifest.get("pagesDownloaded"),
                "rows": len(rows),
            },
        },
        "comparison": {
            "field": "ITEM_INGR_NAME",
            "nonemptyFieldRows": nonempty_ingredient_rows,
            "rowsContainingExactHiraGeneralNameLiteral": literal_name_rows,
            "uniqueItemSeqWithExactHiraGeneralNameLiteral": len(matching_item_ids),
            "rowsWithWholeFieldEqualToHiraGeneralName": exact_whole_field_rows,
            "rowsContainingExactHiraGeneralNameCodeLiteral": code_literal_rows,
        },
        "interpretation": (
            "This comparison can only identify literal text overlap in the supplied sample and "
            "the captured MFDS field. It does not prove that no relationship exists and does "
            "not establish a gnlNmCd-to-ITEM_SEQ identifier bridge. No mapping was produced."
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("product_permit_snapshot", type=Path)
    parser.add_argument("hira_user_sample_directory", type=Path)
    parser.add_argument("output_json", type=Path)
    arguments = parser.parse_args()

    try:
        report = build_report(arguments.product_permit_snapshot, arguments.hira_user_sample_directory)
        arguments.output_json.parent.mkdir(parents=True, exist_ok=True)
        with arguments.output_json.open("x", encoding="utf-8", newline="\n") as output:
            json.dump(report, output, ensure_ascii=False, indent=2)
            output.write("\n")
    except (OSError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 1

    comparison = report["comparison"]
    print(
        "HIRA literal cross-check complete: "
        f"rows={report['sources']['mfdsProductPermit']['rows']}, "
        f"nonemptyIngredients={comparison['nonemptyFieldRows']}, "
        f"nameLiteralRows={comparison['rowsContainingExactHiraGeneralNameLiteral']}, "
        f"codeLiteralRows={comparison['rowsContainingExactHiraGeneralNameCodeLiteral']}, "
        f"report={arguments.output_json}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

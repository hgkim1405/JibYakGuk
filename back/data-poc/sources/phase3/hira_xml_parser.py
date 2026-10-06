"""Parse captured HIRA XML while preserving source field names and provenance."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SOURCE = "hira-ingredient-effect"
MAX_XML_BYTES = 10 * 1024 * 1024
SAFE_METADATA_FIELDS = (
    "source",
    "captureOrigin",
    "capturedAt",
    "requestedAt",
    "httpStatus",
    "contentType",
    "pageNo",
    "numOfRows",
    "queryParameterNames",
)


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def direct_children(parent: ET.Element, name: str) -> list[ET.Element]:
    return [child for child in parent if local_name(child.tag) == name]


def one_child(parent: ET.Element, name: str, *, required: bool) -> ET.Element | None:
    matches = direct_children(parent, name)
    if len(matches) > 1 or (required and not matches):
        raise ValueError(f"Expected one {name} XML element; found {len(matches)}.")
    return matches[0] if matches else None


def text_child(parent: ET.Element, name: str, *, required: bool) -> str | None:
    element = one_child(parent, name, required=required)
    if element is None:
        return None
    if len(element):
        raise ValueError(f"Unexpected nested XML elements inside {name}.")
    return element.text or ""


def positive_or_nonnegative_int(value: str | None, field: str, *, allow_zero: bool) -> int:
    if value is None or not re.fullmatch(r"\d+", value.strip()):
        raise ValueError(f"HIRA XML has invalid {field}.")
    parsed = int(value)
    if parsed < (0 if allow_zero else 1):
        raise ValueError(f"HIRA XML has invalid {field}.")
    return parsed


def parse_item(item: ET.Element, index: int) -> dict[str, str]:
    fields: dict[str, str] = {}
    for field in item:
        key = local_name(field.tag)
        if key in fields:
            raise ValueError(f"HIRA item {index} contains duplicate field {key}.")
        if len(field):
            raise ValueError(f"HIRA item {index} field {key} contains nested XML elements.")
        fields[key] = field.text or ""
    return fields


def safe_provenance(metadata: dict[str, Any], xml_path: Path, sha256: str) -> dict[str, Any]:
    selected = {field: metadata[field] for field in SAFE_METADATA_FIELDS if field in metadata}
    return {
        **selected,
        "rawFile": xml_path.name,
        "rawXmlSha256": sha256,
    }


def parse_hira_xml(raw_xml: bytes, *, raw_file: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    if len(raw_xml) > MAX_XML_BYTES:
        raise ValueError(f"HIRA XML exceeds the {MAX_XML_BYTES}-byte size limit.")
    if re.search(rb"<!\s*(DOCTYPE|ENTITY)\b", raw_xml, re.IGNORECASE):
        raise ValueError("HIRA XML document type and entity declarations are not accepted.")

    try:
        root = ET.fromstring(raw_xml)
    except ET.ParseError as error:
        raise ValueError("HIRA response is not well-formed XML.") from error
    if local_name(root.tag) != "response":
        raise ValueError("HIRA XML root element is not response.")

    header = one_child(root, "header", required=True)
    assert header is not None
    result_code = text_child(header, "resultCode", required=True)
    result_message = text_child(header, "resultMsg", required=True)
    body = one_child(root, "body", required=False)
    if result_code == "00" and body is None:
        raise ValueError("Successful HIRA response is missing body.")

    response_body: dict[str, Any] | None = None
    if body is not None:
        total_count = positive_or_nonnegative_int(
            text_child(body, "totalCount", required=True), "totalCount", allow_zero=True
        )
        page_no = positive_or_nonnegative_int(text_child(body, "pageNo", required=True), "pageNo", allow_zero=False)
        num_of_rows = positive_or_nonnegative_int(
            text_child(body, "numOfRows", required=True), "numOfRows", allow_zero=False
        )
        items_node = one_child(body, "items", required=False)
        items = [] if items_node is None else [parse_item(item, index + 1) for index, item in enumerate(direct_children(items_node, "item"))]
        if len(items) > num_of_rows:
            raise ValueError("HIRA item count exceeds numOfRows.")
        response_body = {
            "totalCount": total_count,
            "pageNo": page_no,
            "numOfRows": num_of_rows,
            "items": items,
        }

    sha256 = hashlib.sha256(raw_xml).hexdigest()
    return {
        "source": SOURCE,
        "parsedAt": datetime.now(timezone.utc).isoformat(),
        "provenance": safe_provenance(metadata or {}, Path(raw_file), sha256),
        "header": {"resultCode": result_code, "resultMsg": result_message},
        "body": response_body,
        "itemFieldNames": sorted({field for item in (response_body or {}).get("items", []) for field in item}),
        "fieldPolicy": "Item tags are preserved under their exact source names; no field aliasing or cross-source join is performed.",
    }


def load_metadata(metadata_path: Path | None) -> dict[str, Any]:
    if metadata_path is None:
        return {}
    value = json.loads(metadata_path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("Metadata must be a JSON object.")
    return value


def default_metadata_path(raw_path: Path) -> Path | None:
    candidates = [raw_path.with_suffix(".metadata.json"), raw_path.parent / "metadata.json"]
    return next((path for path in candidates if path.is_file()), None)


def default_output_path(raw_path: Path) -> Path:
    back_directory = Path(__file__).resolve().parents[3]
    output_directory = back_directory / "data" / "normalized" / SOURCE
    return output_directory / f"{raw_path.parent.name}-{raw_path.stem}-parsed.json"


def main() -> int:
    parser = argparse.ArgumentParser(description="Parse a saved HIRA XML response without aliasing source fields.")
    parser.add_argument("raw_xml", type=Path)
    parser.add_argument("--metadata", type=Path, default=None)
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()

    metadata_path = args.metadata if args.metadata is not None else default_metadata_path(args.raw_xml)
    output_path = args.output if args.output is not None else default_output_path(args.raw_xml)
    try:
        parsed = parse_hira_xml(
            args.raw_xml.read_bytes(),
            raw_file=args.raw_xml,
            metadata=load_metadata(metadata_path),
        )
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("x", encoding="utf-8", newline="\n") as output:
            json.dump(parsed, output, ensure_ascii=False, indent=2)
            output.write("\n")
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(str(error), file=sys.stderr)
        return 1

    body = parsed["body"]
    item_count = len(body["items"]) if body is not None else 0
    print(json.dumps({
        "output": str(output_path),
        "resultCode": parsed["header"]["resultCode"],
        "totalCount": body["totalCount"] if body is not None else None,
        "itemsParsed": item_count,
        "itemFieldNames": parsed["itemFieldNames"],
        "captureOrigin": parsed["provenance"].get("captureOrigin", "local-file"),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

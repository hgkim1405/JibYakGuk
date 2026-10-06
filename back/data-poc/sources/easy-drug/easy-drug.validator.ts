import type { EasyDrugApiItem, EasyDrugApiResponse } from "./easy-drug.types";

const documentedItemFields = new Set([
  "entpName",
  "itemName",
  "itemSeq",
  "efcyQesitm",
  "useMethodQesitm",
  "atpnWarnQesitm",
  "atpnQesitm",
  "intrcQesitm",
  "seQesitm",
  "depositMethodQesitm",
  "openDe",
  "updateDe",
  "itemImage",
]);

const nullableTextFields = new Set([
  "efcyQesitm",
  "useMethodQesitm",
  "atpnWarnQesitm",
  "atpnQesitm",
  "intrcQesitm",
  "seQesitm",
  "depositMethodQesitm",
  "itemImage",
]);

const requiredNonEmptyTextFields = ["entpName", "itemName", "itemSeq", "openDe", "updateDe"] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNonEmptyString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid e약은요 response: ${path} must be a non-empty string.`);
  }
}

function assertNonNegativeInteger(value: unknown, path: string): asserts value is number {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 0) {
    throw new Error(`Invalid e약은요 response: ${path} must be a non-negative integer.`);
  }
}

function validateItem(value: unknown, index: number): asserts value is EasyDrugApiItem {
  if (!isObject(value)) {
    throw new Error(`Invalid e약은요 response: body.items[${index}] must be an object.`);
  }
  for (const field of requiredNonEmptyTextFields) {
    assertNonEmptyString(value[field], `body.items[${index}].${field}`);
  }

  for (const field of documentedItemFields) {
    if (!Object.hasOwn(value, field)) {
      throw new Error(`Invalid e약은요 response: body.items[${index}].${field} is missing.`);
    }
    if (nullableTextFields.has(field)) {
      if (value[field] !== null && typeof value[field] !== "string") {
        throw new Error(`Invalid e약은요 response: body.items[${index}].${field} must be a string or null.`);
      }
    } else {
      assertNonEmptyString(value[field], `body.items[${index}].${field}`);
    }
  }

  if (Object.hasOwn(value, "bizrno") && value.bizrno !== null && typeof value.bizrno !== "string") {
    throw new Error(`Invalid e약은요 response: body.items[${index}].bizrno must be a string or null.`);
  }
}

export function validateEasyDrugResponse(value: unknown): EasyDrugApiResponse {
  if (!isObject(value) || !isObject(value.header) || !isObject(value.body)) {
    throw new Error("Invalid e약은요 response: expected header and body objects.");
  }

  assertNonEmptyString(value.header.resultCode, "header.resultCode");
  assertNonEmptyString(value.header.resultMsg, "header.resultMsg");
  assertNonNegativeInteger(value.body.pageNo, "body.pageNo");
  assertNonNegativeInteger(value.body.numOfRows, "body.numOfRows");
  assertNonNegativeInteger(value.body.totalCount, "body.totalCount");
  if (value.body.pageNo === 0 || value.body.numOfRows === 0) {
    throw new Error("Invalid e약은요 response: body.pageNo and body.numOfRows must be positive integers.");
  }
  if (!Array.isArray(value.body.items)) {
    throw new Error("Invalid e약은요 response: body.items must be an array.");
  }
  value.body.items.forEach(validateItem);

  return value as unknown as EasyDrugApiResponse;
}

export function getUndocumentedItemFields(item: EasyDrugApiItem): string[] {
  return Object.keys(item).filter((field) => !documentedItemFields.has(field)).sort();
}

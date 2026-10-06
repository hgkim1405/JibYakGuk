import type { EasyDrugApiItem } from "./easy-drug.types";

export type CoverageRate = {
  present: number;
  denominator: number;
  percent: number | null;
};

function rate(present: number, denominator: number): CoverageRate {
  return {
    present,
    denominator,
    percent: denominator === 0 ? null : Number(((present / denominator) * 100).toFixed(1)),
  };
}

function hasContent(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function hasHttpUrlSyntax(value: unknown): boolean {
  if (!hasContent(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function rawDateRange(items: EasyDrugApiItem[]) {
  const values = items
    .map((item) => item.updateDe)
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .sort();
  return {
    minimum: values[0] ?? null,
    maximum: values.at(-1) ?? null,
    basis: "lexicographic range of non-empty raw updateDe strings",
  };
}

export function calculateEasyDrugCoverage(items: EasyDrugApiItem[], totalCount: number) {
  const itemSeqs = items.map((item) => item.itemSeq).filter(hasContent);
  const itemSeqGroups = new Map<string, EasyDrugApiItem[]>();
  for (const item of items) {
    if (!hasContent(item.itemSeq)) continue;
    const group = itemSeqGroups.get(item.itemSeq) ?? [];
    group.push(item);
    itemSeqGroups.set(item.itemSeq, group);
  }
  const duplicateItemGroups = [...itemSeqGroups.values()].filter((group) => group.length > 1);
  const duplicateFieldVariationGroupCounts: Record<string, number> = {};
  for (const group of duplicateItemGroups) {
    const fields = [...new Set(group.flatMap((item) => Object.keys(item)))];
    for (const field of fields) {
      const variants = new Set(group.map((item) => JSON.stringify(item[field])));
      if (variants.size > 1) {
        duplicateFieldVariationGroupCounts[field] = (duplicateFieldVariationGroupCounts[field] ?? 0) + 1;
      }
    }
  }
  const itemImagePresent = items.filter((item) => hasContent(item.itemImage)).length;
  const validImageUrl = items.filter((item) => hasHttpUrlSyntax(item.itemImage)).length;

  return {
    totalCount,
    downloadedRows: items.length,
    uniqueItemSeq: new Set(itemSeqs).size,
    duplicates: itemSeqs.length - new Set(itemSeqs).size,
    duplicateGroups: duplicateItemGroups.length,
    duplicateFieldVariationGroupCounts,
    efcyCoverage: rate(items.filter((item) => hasContent(item.efcyQesitm)).length, items.length),
    useMethodCoverage: rate(items.filter((item) => hasContent(item.useMethodQesitm)).length, items.length),
    warningCoverage: rate(items.filter((item) => hasContent(item.atpnWarnQesitm)).length, items.length),
    interactionCoverage: rate(items.filter((item) => hasContent(item.intrcQesitm)).length, items.length),
    sideEffectCoverage: rate(items.filter((item) => hasContent(item.seQesitm)).length, items.length),
    imageCoverage: rate(itemImagePresent, items.length),
    updateDateRange: rawDateRange(items),
    image: {
      totalProducts: items.length,
      itemImagePresent,
      itemImageMissing: items.length - itemImagePresent,
      validImageUrl,
      validImageUrlBasis: "syntactic HTTP(S) URL check only; no image request was made",
      brokenImageUrl: null,
      brokenImageUrlStatus: "not checked",
    },
    pillIdentificationMatched: null,
    pillIdentificationMatchedStatus: "not checked; no pill-identification join was run",
  };
}

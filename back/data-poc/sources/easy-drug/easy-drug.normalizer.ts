import type { EasyDrugApiItem, EasyDrugNormalizedItem } from "./easy-drug.types";

function optionalText(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value;
}

function requiredText(value: unknown, field: string): string {
  const text = optionalText(value);
  if (text === null) throw new Error(`Cannot normalize e약은요 item: ${field} is empty.`);
  return text;
}

export function normalizeEasyDrugItem(item: EasyDrugApiItem): EasyDrugNormalizedItem {
  return {
    source: "easy-drug",
    entpName: requiredText(item.entpName, "entpName"),
    itemName: requiredText(item.itemName, "itemName"),
    itemSeq: requiredText(item.itemSeq, "itemSeq"),
    efcyQesitm: optionalText(item.efcyQesitm),
    useMethodQesitm: optionalText(item.useMethodQesitm),
    atpnWarnQesitm: optionalText(item.atpnWarnQesitm),
    atpnQesitm: optionalText(item.atpnQesitm),
    intrcQesitm: optionalText(item.intrcQesitm),
    seQesitm: optionalText(item.seQesitm),
    depositMethodQesitm: optionalText(item.depositMethodQesitm),
    openDe: requiredText(item.openDe, "openDe"),
    updateDe: requiredText(item.updateDe, "updateDe"),
    itemImage: optionalText(item.itemImage),
  };
}

export function normalizeEasyDrugItems(items: EasyDrugApiItem[]): EasyDrugNormalizedItem[] {
  return items.map(normalizeEasyDrugItem);
}

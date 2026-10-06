/** Observed response shape from a complete 4,757-row paginated response, 2026-10-06. */
export type EasyDrugApiItem = {
  entpName: string;
  itemName: string;
  itemSeq: string;
  efcyQesitm: string | null;
  useMethodQesitm: string | null;
  atpnWarnQesitm: string | null;
  atpnQesitm: string | null;
  intrcQesitm: string | null;
  seQesitm: string | null;
  depositMethodQesitm: string | null;
  openDe: string;
  updateDe: string;
  itemImage: string | null;
  /** Present in the observed response, but not listed in the supplied response-element table. */
  bizrno?: string | null;
  [field: string]: unknown;
};

export type EasyDrugApiResponse = {
  header: {
    resultCode: string;
    resultMsg: string;
  };
  body: {
    pageNo: number;
    totalCount: number;
    numOfRows: number;
    items: EasyDrugApiItem[];
  };
};

export type EasyDrugNormalizedItem = {
  source: "easy-drug";
  entpName: string;
  itemName: string;
  itemSeq: string;
  efcyQesitm: string | null;
  useMethodQesitm: string | null;
  atpnWarnQesitm: string | null;
  atpnQesitm: string | null;
  intrcQesitm: string | null;
  seQesitm: string | null;
  depositMethodQesitm: string | null;
  openDe: string;
  updateDe: string;
  itemImage: string | null;
};

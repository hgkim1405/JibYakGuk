import { Buffer } from "node:buffer";

export const PHASE3_SOURCE_CONFIG = {
  "product-permit": {
    endpoint:
      "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnInq08",
    apiKeyParameter: "serviceKey",
    format: "json",
  },
  "safe-otc": {
    endpoint: "https://apis.data.go.kr/1471000/SafeStadDrugService/getSafeStadDrugInq",
    apiKeyParameter: "serviceKey",
    format: "json",
  },
  "pill-identification": {
    endpoint:
      "https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03",
    apiKeyParameter: "serviceKey",
    format: "json",
  },
  "hira-ingredient-effect": {
    endpoint:
      "https://apis.data.go.kr/B551182/msupCmpnMeftInfoService/getMajorCmpnNmCdList",
    apiKeyParameter: "ServiceKey",
    format: "xml",
  },
} as const;

export type Phase3SourceId = keyof typeof PHASE3_SOURCE_CONFIG;

export type Phase3QueryParameters = Record<string, string>;

const ALLOWED_QUERY_PARAMETERS: Record<Phase3SourceId, ReadonlySet<string>> = {
  "product-permit": new Set([
    "induty", "spclty_pblc", "prdlst_Stdr_code", "entp_name", "prduct_prmisn_no", "item_name",
    "entp_seq", "entp_no", "edi_code", "item_ingr_name", "bizrno",
  ]),
  "safe-otc": new Set(["PRDLST_NM", "BSSH_NM"]),
  "pill-identification": new Set([
    "item_name", "entp_name", "item_seq", "img_regist_ts", "edi_code", "bizrno",
  ]),
  "hira-ingredient-effect": new Set(["gnlNmCd", "gnlNm", "meftDivNo", "divNm"]),
};

export type Phase3HttpResponse = {
  status: number;
  contentType: string | null;
  body: Buffer;
};

function getServiceKey(): { queryValue: string; secretValues: string[] } {
  const configuredKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!configuredKey) {
    throw new Error("DATA_GO_KR_SERVICE_KEY is required for a Phase 3 request.");
  }

  const format = process.env.DATA_GO_KR_SERVICE_KEY_FORMAT ?? "ENCODED";
  if (format === "ENCODED") {
    let decodedKey: string;
    try {
      decodedKey = decodeURIComponent(configuredKey);
    } catch {
      throw new Error("DATA_GO_KR_SERVICE_KEY is not valid URL-encoded text.");
    }
    return { queryValue: decodedKey, secretValues: [configuredKey, decodedKey] };
  }
  if (format === "DECODED") {
    return { queryValue: configuredKey, secretValues: [configuredKey] };
  }
  throw new Error("DATA_GO_KR_SERVICE_KEY_FORMAT must be ENCODED or DECODED.");
}

export async function requestPhase3Page(
  sourceId: Phase3SourceId,
  pageNo: number,
  numOfRows: number,
  queryParameters: Phase3QueryParameters = {},
): Promise<Phase3HttpResponse> {
  const source = PHASE3_SOURCE_CONFIG[sourceId];
  const { queryValue: serviceKey, secretValues } = getServiceKey();
  const url = new URL(source.endpoint);
  url.searchParams.set(source.apiKeyParameter, serviceKey);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));
  if (source.format === "json") url.searchParams.set("type", "json");
  for (const [name, value] of Object.entries(queryParameters)) {
    if (!ALLOWED_QUERY_PARAMETERS[sourceId].has(name) || !value.trim()) {
      throw new Error(`Unsupported or empty query parameter for ${sourceId}: ${name}.`);
    }
    if (secretValues.some((secret) => secret && value.includes(secret))) {
      throw new Error("Query parameters must not contain credential text.");
    }
    url.searchParams.set(name, value);
  }

  let response: Response;
  try {
    response = await fetch(url, { method: "GET", signal: AbortSignal.timeout(30_000) });
  } catch {
    // Native fetch errors can include the complete request URL, which contains the key.
    throw new Error(`The ${sourceId} HTTP request failed; request details were withheld.`);
  }

  const body = Buffer.from(await response.arrayBuffer());
  if (secretValues.some((secret) => secret && body.includes(Buffer.from(secret)))) {
    throw new Error(`The ${sourceId} response contained credential text; raw response was not saved.`);
  }

  return {
    status: response.status,
    contentType: response.headers.get("content-type"),
    body,
  };
}

import { Buffer } from "node:buffer";

export const EASY_DRUG_ENDPOINT =
  "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList";

export type EasyDrugRequest = {
  pageNo: number;
  numOfRows: number;
  type: "json";
};

export type EasyDrugHttpResponse = {
  status: number;
  contentType: string | null;
  body: Buffer;
};

function getServiceKey(): { queryValue: string; secretValues: string[] } {
  const configuredKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!configuredKey) {
    throw new Error("DATA_GO_KR_SERVICE_KEY is required for the e약은요 request.");
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

export async function requestEasyDrugPage(
  params: EasyDrugRequest,
): Promise<EasyDrugHttpResponse> {
  const { queryValue: serviceKey, secretValues } = getServiceKey();
  const url = new URL(EASY_DRUG_ENDPOINT);
  url.searchParams.set("ServiceKey", serviceKey);
  url.searchParams.set("pageNo", String(params.pageNo));
  url.searchParams.set("numOfRows", String(params.numOfRows));
  url.searchParams.set("type", params.type);

  let response: Response;
  try {
    response = await fetch(url, { method: "GET", signal: AbortSignal.timeout(30_000) });
  } catch {
    // Native fetch errors can include the complete request URL, which contains the key.
    throw new Error("The e약은요 HTTP request failed; request details were withheld.");
  }

  const body = Buffer.from(await response.arrayBuffer());
  if (secretValues.some((secret) => secret && body.includes(Buffer.from(secret)))) {
    throw new Error("The e약은요 response contained credential text; raw response was not saved.");
  }

  return {
    status: response.status,
    contentType: response.headers.get("content-type"),
    body,
  };
}

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

type JsonRecord = Record<string, unknown>;
type UrlRecord = { sourceRefs: Array<{ rawFile: string; rowInPage: number }> };

const sourceDirectory = __dirname;
const defaultReportDirectory = resolve(sourceDirectory, "../../../data/reports/easy-drug");
const allowedHost = "nedrug.mfds.go.kr";

function asRecord(value: unknown, label: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(label + " must be a JSON object.");
  }
  return value as JsonRecord;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === allowedHost;
  } catch {
    return false;
  }
}

async function loadImageUrls(snapshotDirectory: string) {
  const manifest = asRecord(
    JSON.parse((await readFile(resolve(snapshotDirectory, "snapshot-manifest.json"))).toString("utf8")) as unknown,
    "e약은요 snapshot manifest",
  );
  const totalCount = Array.isArray(manifest.totalCountValues) && manifest.totalCountValues.length === 1
    ? manifest.totalCountValues[0]
    : manifest.totalCount;
  const expectedPages = manifest.pagesDownloaded ?? manifest.expectedPages;
  if (
    manifest.source !== "easy-drug" ||
    manifest.complete !== true ||
    typeof totalCount !== "number" ||
    !Number.isInteger(totalCount) ||
    totalCount < 0 ||
    typeof manifest.downloadedRows !== "number" ||
    totalCount !== manifest.downloadedRows ||
    typeof expectedPages !== "number" ||
    !Number.isInteger(expectedPages) ||
    expectedPages < 1
  ) {
    throw new Error("Input is not a complete e약은요 snapshot.");
  }

  const files = (await readdir(snapshotDirectory))
    .filter((file) => /^page-\d{6}\.json$/.test(file))
    .sort();
  if (files.length === 0 || files.length !== expectedPages) {
    throw new Error("e약은요 snapshot page files do not match its manifest.");
  }

  const urls = new Map<string, UrlRecord>();
  let rowsRead = 0;
  for (let pageIndex = 0; pageIndex < files.length; pageIndex++) {
    const rawFile = files[pageIndex];
    const pageNo = pageIndex + 1;
    if (rawFile !== "page-" + String(pageNo).padStart(6, "0") + ".json") {
      throw new Error("e약은요 snapshot has a missing or non-sequential page.");
    }
    const response = asRecord(JSON.parse((await readFile(resolve(snapshotDirectory, rawFile))).toString("utf8")) as unknown, rawFile);
    const header = asRecord(response.header, rawFile + ".header");
    const body = asRecord(response.body, rawFile + ".body");
    if (
      header.resultCode !== "00" ||
      body.pageNo !== pageNo ||
      body.totalCount !== totalCount ||
      typeof body.numOfRows !== "number" ||
      !Number.isInteger(body.numOfRows) ||
      body.numOfRows < 1 ||
      !Array.isArray(body.items) ||
      body.items.length > body.numOfRows
    ) {
      throw new Error("e약은요 " + rawFile + " does not match the successful snapshot pagination contract.");
    }
    for (let rowIndex = 0; rowIndex < body.items.length; rowIndex++) {
      rowsRead++;
      const row = asRecord(body.items[rowIndex], rawFile + ".items[" + rowIndex + "]");
      const imageUrl = row.itemImage;
      if (imageUrl === null || imageUrl === undefined || imageUrl === "") continue;
      if (!isImageUrl(imageUrl)) throw new Error("e약은요 " + rawFile + " row " + (rowIndex + 1) + " has an invalid itemImage URL.");
      const record = urls.get(imageUrl) ?? { sourceRefs: [] };
      if (record.sourceRefs.length < 20) record.sourceRefs.push({ rawFile, rowInPage: rowIndex + 1 });
      urls.set(imageUrl, record);
    }
  }
  if (rowsRead !== totalCount) throw new Error("e약은요 snapshot row count differs from its manifest.");
  return { snapshot: basename(resolve(snapshotDirectory)), rowsRead, urls };
}

function errorCode(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth++) {
    const record = current as JsonRecord;
    const code = record.code;
    if (typeof code === "string" && /^[A-Z0-9_]{1,40}$/.test(code)) return code;
    current = record.cause;
  }
  if (error instanceof DOMException && error.name === "TimeoutError") return "TIMEOUT";
  return null;
}

async function requestImageHeadByte(rawUrl: string, timeoutMs: number) {
  let currentUrl = new URL(rawUrl);
  let redirects = 0;
  while (true) {
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: "GET",
        headers: { Range: "bytes=0-0", "User-Agent": "JibYakGuk-image-availability-check/1.0" },
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      return { classification: "network-error", errorCode: errorCode(error), redirects };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) return { classification: "redirect-without-location", status: response.status, redirects };
      if (redirects >= 4) return { classification: "redirect-limit", status: response.status, redirects };
      const nextUrl = new URL(location, currentUrl);
      if (nextUrl.protocol !== "https:" || nextUrl.hostname !== allowedHost) {
        return { classification: "redirect-outside-allowed-host", status: response.status, redirects };
      }
      currentUrl = nextUrl;
      redirects++;
      continue;
    }

    const contentType = response.headers.get("content-type");
    let firstChunkBytes = 0;
    try {
      const reader = response.body?.getReader();
      if (reader) {
        const firstChunk = await reader.read();
        firstChunkBytes = firstChunk.value?.byteLength ?? 0;
        await reader.cancel();
      }
    } catch {
      // The HTTP status and headers remain useful even if reading the first chunk fails.
    }
    const classification = response.status >= 200 && response.status < 300
      ? (contentType?.toLowerCase().startsWith("image/") ? "http-image" : "http-non-image")
      : "http-error";
    return { classification, status: response.status, contentType, firstChunkBytes, redirects };
  }
}

export async function auditImageUrlSample(
  snapshotDirectory: string,
  sampleSize = 20,
  timeoutMs = 8_000,
  reportPath = resolve(defaultReportDirectory, "image-url-sample-" + new Date().toISOString().replaceAll(":", "-") + ".json"),
) {
  if (!Number.isInteger(sampleSize) || sampleSize < 1) throw new Error("sampleSize must be a positive integer.");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    throw new Error("timeoutMs must be an integer from 1 through 30000.");
  }
  const loaded = await loadImageUrls(resolve(snapshotDirectory));
  const allUrls = [...loaded.urls.keys()].sort();
  if (sampleSize > allUrls.length) throw new Error("Requested sample is larger than the distinct image URL population.");
  const indexes = sampleSize === 1
    ? [0]
    : Array.from({ length: sampleSize }, (_, index) => Math.floor(index * (allUrls.length - 1) / (sampleSize - 1)));
  const selected = indexes.map((index) => allUrls[index]);
  if (new Set(selected).size !== sampleSize) throw new Error("Image sample selection returned duplicate URLs.");

  const observations: Array<Record<string, unknown> & { classification: string; imageUrlSha256: string }> = [];
  const concurrency = 4;
  for (let offset = 0; offset < selected.length; offset += concurrency) {
    const batch = selected.slice(offset, offset + concurrency);
    const results = await Promise.all(batch.map(async (url) => ({
      imageUrlSha256: sha256(url),
      sourceRefs: loaded.urls.get(url)!.sourceRefs,
      ...await requestImageHeadByte(url, timeoutMs),
    })));
    observations.push(...results);
    if (offset + concurrency < selected.length) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
    }
  }

  const classificationCounts: Record<string, number> = {};
  for (const observation of observations) {
    classificationCounts[observation.classification] = (classificationCounts[observation.classification] ?? 0) + 1;
  }
  const report = {
    reportVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    source: "easy-drug",
    sourceSnapshot: loaded.snapshot,
    selection: {
      population: allUrls.length,
      sampleSize,
      algorithm: "sort distinct validated HTTPS itemImage URLs lexically; choose floor(i * (population - 1) / (sampleSize - 1)) for i=0..sampleSize-1",
      selectedUrlHashesSha256: sha256(observations.map((row) => row.imageUrlSha256).join("\n")),
    },
    requestPolicy: {
      method: "GET",
      range: "bytes=0-0",
      maxRedirects: 4,
      allowedRedirectHost: allowedHost,
      maxConcurrentRequests: concurrency,
      delayBetweenBatchesMs: 250,
      timeoutMs,
      responseBodySaved: false,
      fullImageDownloaded: false,
      rawUrlsSaved: false,
    },
    classificationCounts,
    observations,
  };

  await mkdir(resolve(reportPath, ".."), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  return { reportPath, report };
}

if (require.main === module) {
  const [snapshotDirectory, sampleArgument, timeoutArgument, reportPath] = process.argv.slice(2);
  if (!snapshotDirectory) {
    process.stderr.write("Usage: node -r ts-node/register image-url-audit.ts <easyDrugSnapshotDir> [sampleSize=20] [timeoutMs=8000] [reportJson]\n");
    process.exitCode = 2;
  } else {
    const sampleSize = sampleArgument === undefined ? 20 : Number(sampleArgument);
    const timeoutMs = timeoutArgument === undefined ? 8_000 : Number(timeoutArgument);
    auditImageUrlSample(snapshotDirectory, sampleSize, timeoutMs, reportPath)
      .then(({ reportPath: savedPath, report }) => {
        process.stdout.write("Image URL sample report saved: " + savedPath + "\n");
        process.stdout.write(JSON.stringify({ selection: report.selection, classificationCounts: report.classificationCounts }, null, 2) + "\n");
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown image URL audit error.";
        process.stderr.write(message + "\n");
        process.exitCode = 1;
      });
  }
}

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectPhase3Page = collectPhase3Page;
var promises_1 = require("node:fs/promises");
var node_path_1 = require("node:path");
var phase3_raw_client_1 = require("./phase3.raw.client");
var sourceDirectory = __dirname;
var defaultOutputDirectory = (0, node_path_1.resolve)(sourceDirectory, "../../../data/raw/phase3");
function timestamp() {
    return new Date().toISOString().replaceAll(":", "-");
}
function responseExtension(contentType) {
    if (contentType === null || contentType === void 0 ? void 0 : contentType.toLowerCase().includes("json"))
        return "json";
    if (contentType === null || contentType === void 0 ? void 0 : contentType.toLowerCase().includes("xml"))
        return "xml";
    return "body";
}
function collectPhase3Page(sourceId_1) {
    return __awaiter(this, arguments, void 0, function (sourceId, pageNo, numOfRows, outputDirectory) {
        var source, requestedAt, response, rawFile, rawPath, metadataPath;
        if (pageNo === void 0) { pageNo = 1; }
        if (numOfRows === void 0) { numOfRows = 10; }
        if (outputDirectory === void 0) { outputDirectory = (0, node_path_1.resolve)(defaultOutputDirectory, sourceId, "probe-".concat(timestamp())); }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!Number.isInteger(pageNo) || pageNo < 1)
                        throw new Error("pageNo must be a positive integer.");
                    if (!Number.isInteger(numOfRows) || numOfRows < 1) {
                        throw new Error("numOfRows must be a positive integer.");
                    }
                    source = phase3_raw_client_1.PHASE3_SOURCE_CONFIG[sourceId];
                    requestedAt = new Date().toISOString();
                    return [4 /*yield*/, (0, phase3_raw_client_1.requestPhase3Page)(sourceId, pageNo, numOfRows)];
                case 1:
                    response = _a.sent();
                    rawFile = "page-".concat(String(pageNo).padStart(6, "0"), ".").concat(responseExtension(response.contentType));
                    rawPath = (0, node_path_1.resolve)(outputDirectory, rawFile);
                    metadataPath = (0, node_path_1.resolve)(outputDirectory, "page-".concat(String(pageNo).padStart(6, "0"), ".metadata.json"));
                    return [4 /*yield*/, (0, promises_1.mkdir)(outputDirectory, { recursive: true })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, (0, promises_1.writeFile)(rawPath, response.body, { flag: "wx" })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (0, promises_1.writeFile)(metadataPath, "".concat(JSON.stringify({
                            source: sourceId,
                            method: "GET",
                            endpoint: source.endpoint,
                            apiKeyParameterName: source.apiKeyParameter,
                            requestedAt: requestedAt,
                            pageNo: pageNo,
                            numOfRows: numOfRows,
                            responseFormat: source.format,
                            httpStatus: response.status,
                            contentType: response.contentType,
                            byteLength: response.body.byteLength,
                            rawFile: rawFile,
                        }, null, 2), "\n"), { encoding: "utf8", flag: "wx" })];
                case 4:
                    _a.sent();
                    return [2 /*return*/, {
                            source: sourceId,
                            httpStatus: response.status,
                            contentType: response.contentType,
                            byteLength: response.body.byteLength,
                            rawPath: rawPath,
                            metadataPath: metadataPath,
                        }];
            }
        });
    });
}
function isPhase3Source(value) {
    return Object.hasOwn(phase3_raw_client_1.PHASE3_SOURCE_CONFIG, value);
}
if (require.main === module) {
    var _a = process.argv.slice(2), sourceIdArg = _a[0], numOfRowsArg = _a[1], pageNoArg = _a[2];
    if (!sourceIdArg || !isPhase3Source(sourceIdArg)) {
        process.stderr.write("Usage: node -r ts-node/register phase3.raw.collector.ts <".concat(Object.keys(phase3_raw_client_1.PHASE3_SOURCE_CONFIG).join("|"), "> [numOfRows=10] [pageNo=1]\n"));
        process.exitCode = 2;
    }
    else {
        var numOfRows = numOfRowsArg === undefined ? 10 : Number(numOfRowsArg);
        var pageNo_1 = pageNoArg === undefined ? 1 : Number(pageNoArg);
        collectPhase3Page(sourceIdArg, pageNo_1, numOfRows)
            .then(function (result) {
            process.stdout.write("Captured ".concat(result.source, " page ").concat(pageNo_1, ": HTTP ").concat(result.httpStatus, ", bytes=").concat(result.byteLength, ", raw=").concat(result.rawPath, "\n"));
        })
            .catch(function (error) {
            var message = error instanceof Error ? error.message : "Unknown collection error.";
            process.stderr.write("".concat(message, "\n"));
            process.exitCode = 1;
        });
    }
}

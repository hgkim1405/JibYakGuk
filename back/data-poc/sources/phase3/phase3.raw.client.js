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
exports.PHASE3_SOURCE_CONFIG = void 0;
exports.requestPhase3Page = requestPhase3Page;
var node_buffer_1 = require("node:buffer");
exports.PHASE3_SOURCE_CONFIG = {
    "product-permit": {
        endpoint: "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnInq08",
        apiKeyParameter: "serviceKey",
        format: "json",
    },
    "safe-otc": {
        endpoint: "https://apis.data.go.kr/1471000/SafeStadDrugService/getSafeStadDrugInq",
        apiKeyParameter: "serviceKey",
        format: "json",
    },
    "pill-identification": {
        endpoint: "https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03",
        apiKeyParameter: "serviceKey",
        format: "json",
    },
    "hira-ingredient-effect": {
        endpoint: "https://apis.data.go.kr/B551182/msupCmpnMeftInfoService/getMajorCmpnNmCdList",
        apiKeyParameter: "ServiceKey",
        format: "xml",
    },
};
function getServiceKey() {
    var _a;
    var configuredKey = process.env.DATA_GO_KR_SERVICE_KEY;
    if (!configuredKey) {
        throw new Error("DATA_GO_KR_SERVICE_KEY is required for a Phase 3 request.");
    }
    var format = (_a = process.env.DATA_GO_KR_SERVICE_KEY_FORMAT) !== null && _a !== void 0 ? _a : "ENCODED";
    if (format === "ENCODED") {
        var decodedKey = void 0;
        try {
            decodedKey = decodeURIComponent(configuredKey);
        }
        catch (_b) {
            throw new Error("DATA_GO_KR_SERVICE_KEY is not valid URL-encoded text.");
        }
        return { queryValue: decodedKey, secretValues: [configuredKey, decodedKey] };
    }
    if (format === "DECODED") {
        return { queryValue: configuredKey, secretValues: [configuredKey] };
    }
    throw new Error("DATA_GO_KR_SERVICE_KEY_FORMAT must be ENCODED or DECODED.");
}
function requestPhase3Page(sourceId, pageNo, numOfRows) {
    return __awaiter(this, void 0, void 0, function () {
        var source, _a, serviceKey, secretValues, url, response, _b, body, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    source = exports.PHASE3_SOURCE_CONFIG[sourceId];
                    _a = getServiceKey(), serviceKey = _a.queryValue, secretValues = _a.secretValues;
                    url = new URL(source.endpoint);
                    url.searchParams.set(source.apiKeyParameter, serviceKey);
                    url.searchParams.set("pageNo", String(pageNo));
                    url.searchParams.set("numOfRows", String(numOfRows));
                    if (source.format === "json")
                        url.searchParams.set("type", "json");
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch(url, { method: "GET", signal: AbortSignal.timeout(30000) })];
                case 2:
                    response = _e.sent();
                    return [3 /*break*/, 4];
                case 3:
                    _b = _e.sent();
                    // Native fetch errors can include the complete request URL, which contains the key.
                    throw new Error("The ".concat(sourceId, " HTTP request failed; request details were withheld."));
                case 4:
                    _d = (_c = node_buffer_1.Buffer).from;
                    return [4 /*yield*/, response.arrayBuffer()];
                case 5:
                    body = _d.apply(_c, [_e.sent()]);
                    if (secretValues.some(function (secret) { return secret && body.includes(node_buffer_1.Buffer.from(secret)); })) {
                        throw new Error("The ".concat(sourceId, " response contained credential text; raw response was not saved."));
                    }
                    return [2 /*return*/, {
                            status: response.status,
                            contentType: response.headers.get("content-type"),
                            body: body,
                        }];
            }
        });
    });
}

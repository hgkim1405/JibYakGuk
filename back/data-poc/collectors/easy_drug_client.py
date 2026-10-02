"""Minimal transport client for the official e약은요 endpoint.

Callers must provide request parameters only after confirming them against
the approved API contract and an actual response. This client returns the
response body unchanged; parsing and normalization belong in later stages.
"""

from collections.abc import Mapping, Sequence
from urllib.parse import urlencode
from urllib.request import Request, urlopen

EASY_DRUG_ENDPOINT = (
    "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList"
)


class EasyDrugClient:
    def __init__(self, endpoint: str = EASY_DRUG_ENDPOINT, timeout_seconds: float = 30) -> None:
        self._endpoint = endpoint
        self._timeout_seconds = timeout_seconds

    def get_raw(self, params: Mapping[str, str | Sequence[str]]) -> bytes:
        query = urlencode(params, doseq=True)
        url = f"{self._endpoint}?{query}" if query else self._endpoint
        request = Request(url, method="GET")
        with urlopen(request, timeout=self._timeout_seconds) as response:
            return response.read()

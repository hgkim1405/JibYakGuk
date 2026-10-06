# Collectors

새 e약은요 Data PoC의 API client와 collector는 [`../sources/easy-drug/`](../sources/easy-drug/)에 있습니다. HTTP transport와 pagination을 분리하며 raw 응답 본문은 변경 없이 `back/data/raw/easy-drug/`에 저장합니다.

`easy_drug_client.py`는 기존 Python raw-bytes 전송 골격으로, 현재 e약은요 TypeScript PoC 경로에서는 사용하지 않습니다. API query 이름·인증 방식·페이지 크기 등은 제공된 API 명세와 실제 응답을 확인한 뒤 구현해야 합니다. 키를 출력하거나 raw/manifest에 포함하지 않습니다.

# Data PoC

실제 API 승인과 응답 검증을 위한 수집·정규화·coverage·JOIN 작업 공간입니다. API 문서나 예제만으로 response schema를 확정하지 않습니다.

e약은요 client는 공식 endpoint를 대상으로 raw body를 반환하는 최소 전송 골격만 제공합니다. 실제 query parameter, 인증 field, pagination, total count, 응답 구조는 공식 문서 및 실제 API REQUEST + RAW RESPONSE를 확인한 뒤 확정합니다. 현재는 API 호출이나 수집을 실행하지 않았습니다.

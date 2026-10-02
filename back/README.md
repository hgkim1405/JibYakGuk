# Backend

Backend 코드와 PoC 데이터 작업을 분리합니다.

- `node/`: 사용자 REST API, 오케스트레이션, Firebase Admin 및 내부 Python 호출 경계
- `python/`: 내부 FastAPI와 향후 feature/ranking/question/evaluation 모듈
- `data-poc/`: 공식 데이터 요청·원문 보존·coverage·JOIN 검증
- `data/`: 로컬 데이터 산출물 디렉터리. raw와 파생 파일은 기본적으로 Git에서 제외됩니다.

공식 데이터의 실제 응답과 검증이 완료되기 전에는 제품·성분 master나 안전 규칙을 정의하지 않습니다.

# 집약국 작업 인수인계

- 작성일: 2026-10-02 (Asia/Seoul)
- 이어서 할 단계: **Phase 2 — e약은요 API 요청·원문 응답·coverage 검증**
- 저장소 기준점: `main` / `71ec479 (init)` (`origin/main`과 동일)

## 현재 상태

Phase 1 프로젝트 골격이 있습니다. 인수인계 문서 작성 직전 `git status`는 깨끗했습니다. 인수인계 폴더와 루트 README 링크는 아직 새 변경 사항입니다.

**집에서 Git으로 이어 보려면 이 변경 사항을 먼저 사용자의 Git 절차에 따라 동기화해야 합니다.** 인수인계 문서는 아직 commit/push하지 않았습니다.

- `front/`: Vue 3 + TypeScript + Vite 7, Router, Pinia, Axios, PrimeVue 4/Aura 앱 셸과 화면 자리표시자
- `back/node/`: NestJS 11 `GET /health`, Firebase Admin 지연 초기화 골격, Python 호출 client와 ranking 응답 형태 검증
- `back/python/`: FastAPI/Pydantic 앱, `GET /health`; ranking 및 question API 계약은 아직 미구현이라 HTTP 501 반환
- `back/data-poc/collectors/easy_drug_client.py`: 요청 파라미터를 호출자가 주입하면 response body bytes를 그대로 돌려주는 전송 골격
- `back/data/raw/`, `back/data/normalized/`, `back/data/reports/`: 빈 디렉터리만 있습니다. raw와 생성 데이터는 `.gitignore`에 의해 Git에서 제외됩니다.
- 각 영역의 `.env.example`, README, package lock이 있습니다. Node 의존성은 `npm ci`로 복원하고, Python 가상환경은 각 작업 머신에서 다시 만들면 됩니다.

## 확인된 개발 및 검증 상태

- 개발 환경에서 Node `22.14.0`, npm `10.9.2`, Python `3.11.9`를 확인했습니다.
- Frontend와 NestJS TypeScript typecheck, Python `compileall`, `pip check`가 통과했습니다.
- Vite 페이지/진입 모듈과 NestJS/Python `/health`가 HTTP 200을 반환했습니다.
- Python `POST /ranking/predict`는 데이터가 없을 때 HTTP 501을 반환했습니다. 추천 결과나 안전 판단 기능은 없습니다.
- 공식 e약은요 endpoint에 실제 요청하지 않았고, API 승인·서비스 키·응답 schema·quota·license/terms도 확인하지 않았습니다.
- 테스트, production build, Firebase 연결 및 배포는 수행하지 않았습니다. 별도 지시 없이 `npm run build`나 `nest build`를 실행하지 마세요.

## 이어받을 때 기억할 원칙

1. 실제 API `REQUEST + RAW RESPONSE + ANALYSIS`를 보기 전에는 필드와 response schema를 확정하지 않습니다.
2. 원문은 보존하고 normalized 결과와 분리합니다. 출처와 수집 시점을 추적할 수 있어야 합니다.
3. 공식 데이터가 Source of Truth입니다. mock 제품, 임의 safety/DUR 규칙, 가짜 학습 데이터, 임의 추천은 만들지 않습니다.
4. Safety/DUR hard filter는 NestJS 책임이고, Python ranking은 향후 검증된 안전 후보 사이의 순서만 정합니다.
5. API 키와 개인 건강정보를 Git, README, 로그, manifest에 넣지 않습니다. raw 응답과 파생 데이터는 현재 Git ignore 상태입니다. API 이용 조건과 공유 허용 범위를 확인한 뒤 이동/공유 방식을 정합니다.
6. 공식 질문 은행이 검토되기 전에는 Python이 질문을 만들어 사용자에게 제공하지 않습니다.

## 병행 작업 제안

- 집에서 먼저 할 일: 아래 Phase 2 체크리스트의 공식 API 승인·요청 조건 확인과, 허용되는 경우 최소 1회 요청에 필요한 자격 증명 준비
- 저장소 작업: 정확한 query/auth parameter를 공식 문서로 확인한 후 collector 호출부와 비밀값을 제거한 수집 manifest를 구현
- 두 작업이 만날 지점: 실제 요청 예시(키를 제거한 요청 메타데이터)와 원문 응답 샘플/사용 허용 조건을 기준으로 파서와 coverage 코드를 설계

현재 collector에는 API parameter 이름이나 API key 설정이 없습니다. 이 사실을 유지한 채 실제 문서와 응답을 받은 다음 구현하세요. 집과 다른 작업 머신에서 raw 응답을 Git으로 자동 공유하지 마세요. 저장소의 `.gitignore`가 해당 파일을 의도적으로 제외합니다.

## 실행 위치

- Frontend: `front/`에서 `npm ci`, `npm run dev`
- NestJS: `back/node/`에서 `npm ci`, `npm run start:dev`
- Python: `back/python/`에서 Python 3.11 가상환경 생성, `python -m pip install -e .`, `.env.example`을 `.env`로 복사한 뒤 `python -m uvicorn app.main:app --reload`

이전 검증에서 NestJS는 `PORT=34127`로 띄웠습니다. 그 시점에 `localhost:3000/health`는 404 응답이어서 3000번 포트의 실제 응답 주체는 확인하지 않았습니다. 새 환경에서 사용할 포트와 `/health` 응답을 먼저 확인하세요. 이전 개발 서버 프로세스는 검증 후 종료했습니다.

Phase 2의 전체 미완료 항목은 [TODO-PHASE2.md](TODO-PHASE2.md)에 있습니다. 이후 단계의 순서와 진입 조건은 [ROADMAP.md](ROADMAP.md)에 정리했습니다. 날짜별 작업 기록의 작성 규칙과 날짜 인덱스는 [daily/README.md](daily/README.md), 현재 날짜 기록은 [2026-10-02.md](daily/2026-10-02.md)입니다.

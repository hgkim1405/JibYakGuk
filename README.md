# 집약국 (JibYakGuk)

공식 의약품 데이터를 출처로 삼는 생활 의약품 탐색 서비스의 저장소입니다. Phase 1 앱 골격, Phase 2–5 실제 의약품 데이터 검증, Drug Master v1, 그리고 Phase 6 효능 원문 worklist와 lexical review spans가 있습니다. 사람 검토된 증상 분류·안전 판단·추천 결과는 아직 제공하지 않습니다.

Phase 1 상태와 Phase 2 인수인계 항목은 [handoff 문서](handoff/README.md)를 참고하세요.

## 저장소 구성

- `front/`: Vue 3, TypeScript, Vite 7 기반 웹 앱
- `back/node/`: NestJS 11 오케스트레이션 API
- `back/python/`: FastAPI 기반 내부 Python API와 향후 ML 모듈 구조
- `back/data-poc/`: 공식 데이터 수집·검증 PoC
- `back/data/`: Git으로 버전관리되는 raw source snapshot과 로컬 생성 산출물 디렉터리
- `docs/`: 아키텍처, 데이터, ML, API 문서 위치

## 개발 환경

- Node.js `22.14.0` (`.node-version` 참조)
- npm `10.x`
- Python `3.11.x`

각 앱은 독립된 패키지입니다. 해당 디렉터리에서 의존성을 설치한 뒤 실행합니다.

```powershell
cd front
npm install
npm run dev
```

```powershell
cd back/node
npm install
npm run start:dev
```

```powershell
cd back/python
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e .
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload
```

기본 로컬 주소는 Frontend `http://localhost:5173`, NestJS `http://localhost:3000`, Python API `http://localhost:8000`입니다. Python API는 NestJS 내부 호출 대상이며 브라우저에서 직접 호출하지 않습니다.

각 서비스의 환경 변수는 해당 디렉터리의 `.env.example`을 참고하세요. Firebase는 Admin SDK 연결 골격만 있으며, 로컬 자격 증명이나 Firestore 호출은 설정되지 않았습니다.

## 데이터와 추천 원칙

구현 순서는 실제 공식 API 요청·원문 응답·coverage 확인·JOIN·검증 이후에 Drug Master, Safety Engine, 추천과 UI 데이터 연결로 진행합니다. 공식 데이터가 Source of Truth이며, Python ranking은 향후 검증된 안전 후보 사이의 순서를 정하는 역할만 맡습니다. 현재 단계에서는 실제 데이터와 검증된 안전 규칙이 없어 추천 또는 의학적 판단 기능을 제공하지 않습니다.

2026-10-06에 e약은요 API에서 4,757행을 받아 raw response를 보존하고 실제 응답 기준 정규화·coverage를 생성했습니다. 낱알식별 API와는 exact `itemSeq` JOIN 2,751/4,740개 고유 ID (58.0%)를 확인했습니다. 남은 항목과 source별 근거는 [`back/data-poc/sources/easy-drug/OBSERVATIONS-2026-10-06.md`](back/data-poc/sources/easy-drug/OBSERVATIONS-2026-10-06.md), [Phase 3 관찰](back/data-poc/sources/PHASE3-OBSERVATIONS-2026-10-06.md), [인수인계 기록](handoff/README.md)에 있습니다. 이미지 URL 접근성, HIRA non-empty response, DUR 실제 응답, Firestore schema와 추천 기능은 아직 미완료입니다.

검증된 raw API snapshots는 [`back/data/raw/`](back/data/raw/README.md)에 provenance와 함께 Git으로 버전관리합니다. 다른 PC에서는 이 commit의 동일한 원문 데이터로 정규화·리포트를 다시 생성할 수 있어 API 재수집이나 key가 필요하지 않습니다. `.env`, normalized files, reports는 Git에 포함하지 않습니다.

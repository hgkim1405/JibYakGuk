# 집약국 (JibYakGuk)

공식 의약품 데이터를 출처로 삼는 생활 의약품 탐색 서비스의 저장소입니다. 현재는 Phase 1 프로젝트 골격이며, 실제 의약품 수집·정규화·안전 판단·추천 결과는 아직 제공하지 않습니다.

Phase 1 상태와 Phase 2 인수인계 항목은 [handoff 문서](handoff/README.md)를 참고하세요.

## 저장소 구성

- `front/`: Vue 3, TypeScript, Vite 7 기반 웹 앱
- `back/node/`: NestJS 11 오케스트레이션 API
- `back/python/`: FastAPI 기반 내부 Python API와 향후 ML 모듈 구조
- `back/data-poc/`: 공식 데이터 수집·검증 PoC
- `back/data/`: 로컬 원문·정규화·리포트 데이터 디렉터리
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

e약은요 공식 API client 골격과 raw/normalized/reports 저장 위치는 `back/data-poc/`와 `back/data/`에 있습니다. API 사용 승인, 실제 요청 파라미터, 원문 응답, license/terms 및 coverage는 별도 검증이 필요합니다.

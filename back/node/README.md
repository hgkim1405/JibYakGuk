# NestJS backend

Node.js `22.14.0`과 NestJS `11.x`를 사용합니다. Nest CLI generator 대신 설정과 source를 직접 관리합니다.

```powershell
npm install
npm run start:dev
```

`GET http://localhost:3000/health`는 NestJS 프로세스 상태만 반환합니다. Firestore 초기화는 명시적으로 요청될 때 지연 실행되므로 환경 자격 증명 없이 앱을 시작해도 Firestore 연결을 시도하지 않습니다. Python 응답은 ranking DTO 형태를 확인한 뒤 사용합니다.

`.env.example`에는 비밀값을 두지 않습니다. Firebase Admin은 표준 Application Default Credentials를 사용하도록 구성할 수 있으며, 실제 자격 증명 파일이나 키는 저장소에 넣지 마세요.

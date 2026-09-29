# 동행 관측소 — 병렬 개발 계약

## 범위
행정동별 사회적 고립 대응 지원 서비스의 공개 시연 MVP. 기존 연구 데이터는 사용하지 않는다. 실제 행정동 경계 위에 결정적으로 생성한 **합성 위험 데이터와 가상 정책**을 표시한다. 실제 진단, 학습된 모델, 실제 정책 자격 판정으로 표현하지 않는다.

## 디렉터리 소유권
- frontend/: 지도·대시보드 작업 담당. React + TypeScript + Vite + Leaflet. 패키지·설정·UI·mock 실행기 포함.
- backend/: FastAPI + LangGraph 작업 담당. requirements/pyproject, 테스트, Dockerfile 포함.
- docs/ARCHITECTURE.md, docs/DEPLOYMENT.md, docs/QA.md: 배포·기술 문서 작업 담당.
- shared/, 루트 README·CI·Git 설정: 통합 담당(부모 작업).
다른 영역 파일은 읽기만 한다. 작업별 커밋·푸시는 하지 않는다. 통합 담당이 검증 후 한번에 처리한다.

## 프런트엔드 실행
- `VITE_APP_MODE=mock` 기본값. 서버·LLM 키 없이 전체 흐름 작동. `VITE_APP_MODE=api`는 `VITE_API_BASE_URL` 필요; 실패 시 mock으로 조용히 전환하지 않는다.
- Vite `publicDir: '../shared'`, `base: process.env.VITE_BASE_PATH || '/'`.
- 정적 파일 `${import.meta.env.BASE_URL}mock/districts.geojson`, `mock/dataset.json`.
- 지도 경계 Feature properties는 `code`(문자열), `name`(행정동), `district`(자치구). CRS EPSG:4326. geometry Polygon/MultiPolygon.
- 기본 시나리오 normal; `normal | risk_spike | missing_data | expired_policy | no_policy` 지원.
- 정상/관심/위험/자료부족은 색뿐 아니라 텍스트로 구분. 모든 화면에 시연용 합성 데이터 표시.
- 위험 점수는 시연용 0~100 지수이며 확률이 아니다. 위험 70 이상, 관심 40 이상; 이 기준은 시연 전용.

## 데이터 계약
`shared/mock/dataset.json`:
```json
{
  "schema_version":"1.0", "mode":"mock", "as_of":"2026-09-29T09:00:00+09:00",
  "disclaimer":"위험도·지표·정책은 흐름 확인을 위한 가상 데이터입니다.",
  "districts":[{
    "code":"string", "name":"string", "district":"string",
    "risk_score":55, "risk_level":"watch", "previous_score":48,
    "quality":"valid", "population":15000,
    "signals":[{"key":"mobility","label":"외출·이동 지표","value":76,"unit":"지수","change_pct":-12}],
    "trend":[{"period":"2026-04","score":40}],
    "summary":"시연용 지역 관측 내용"
  }],
  "policies":[{
    "id":"demo-policy-1", "title":"[가상] 지역 연결 프로그램", "districts":["*"],
    "target":"지역 주민", "tags":["mobility","connection"],
    "description":"시연용 정책", "start_date":"2026-01-01", "end_date":"2026-12-31",
    "source_url":null, "is_mock":true, "contact":"시연용 — 실제 접수처 없음"
  }]
}
```

## API 계약
- `GET /api/health`: `{status:"ok", mode:"mock", graph:"langgraph"}`
- `GET /api/districts`: 위 dataset 전체 (api 모드에서도 서버 APP_MODE=mock이면 명시적 mock 데이터라는 의미).
- `POST /api/runs`: `{district_code:string, scenario:"normal"|"risk_spike"|"missing_data"|"expired_policy"|"no_policy"}`. MVP는 동기 실행 후 아래 전체 결과 반환. SSE/비동기 큐는 향후 범위.
- `GET /api/runs/{run_id}`: 메모리 내 실행 결과 조회. 재시작 시 없어지는 시연 저장소임을 문서화.
- 요청에 없는 동/잘못된 시나리오 4xx. APP_MODE=live는 실제 모델이 연결될 때까지 명시적 실패(501 또는 시작 차단), 합성 데이터 fallback 금지.

RunResult:
```json
{
  "run_id":"string", "mode":"mock", "district_code":"string", "scenario":"normal",
  "status":"completed", "risk_score":55, "risk_level":"watch",
  "summary":"가상 실행 결과", "policies":[], "warnings":[],
  "steps":[{"id":"validate","label":"데이터 품질 확인","status":"completed","detail":"확인 내용"}],
  "completed_at":"ISO timestamp"
}
```
`status`: completed | held; `risk_level`: low | watch | high | unknown; missing_data는 risk_score null, risk_level unknown, status held, 정책 빈 배열.

## mock 시나리오 공통 규칙
- normal: 해당 동 원래 점수. 시연 조사와 적용 가능한 가상 정책 1~3개 표시.
- risk_spike: min(99, base_score + 30), 변화 조사 단계 포함.
- missing_data: 점수 null, unknown, held. 추가 정책 검색하지 않고 누락 경고.
- expired_policy: 만료 가상 후보 확인 후 제외하고 유효한 대체 후보 재검색. 단계에 재검색 표시.
- no_policy: 정책 후보 없음. 정책 공백/담당자 확인 필요 명시. 무한 반복 없음.
- frontend mock 실행은 브라우저 시뮬레이션, backend는 실제 LangGraph 실행 + 결정적 mock 판단. 둘 다 실제 LLM 자율 추론/학습 모델로 홍보하지 않는다.
- 외부 통신·개인정보·비밀키 없이 시연 가능. 실제 LLM/정책/모델 연결 지점은 문서화.

## UI 방향
이름: 동행 관측소. 한국어 행정 담당자용 지도 워크스페이스. 짙은 남색 내비게이션, 흰색/옅은 청회색 작업 영역, 청록색 조작 요소, 주황·적색 위험 신호. 지도가 화면의 중심, 우측 상세 패널, 실제 의미가 있는 단계 타임라인. 모바일·키보드 접근성·로딩·오류·빈 상태·반복 실행 제어 필수. 장식용 통계 카드와 불필요한 그라디언트는 지양.

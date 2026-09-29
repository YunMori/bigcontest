# 동행 관측소 백엔드

실제 **LangGraph StateGraph**로 분기와 재검색을 실행하는 FastAPI 시연 서버입니다. 모든 위험 결과·조사·정책은 합성 자료와 결정적 규칙을 사용합니다. LLM, 학습된 위험 모델, 실시간 정책 검색, 개인 자격 심사는 연결되지 않았습니다. 실행 시 외부 서비스나 비밀키가 필요하지 않습니다.

## 실행

Python 3.12 기준. 아래 명령은 저장소 루트 `service/`에서 실행합니다.

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
cd backend
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

API 문서는 `http://127.0.0.1:8000/docs`입니다. 테스트:

```sh
cd backend  # service/ 기준
.venv/bin/python -m pytest -q
.venv/bin/python -m pip check
```

`requirements.in`은 직접 의존성을 기록하고, 설치용 `requirements.txt`와 `requirements-dev.txt`는 전이 의존성까지 버전을 고정합니다. 개발 환경 검증 버전: FastAPI 0.141.1, LangGraph 1.2.12, Pydantic 2.13.5, Uvicorn 0.54.0.

## 환경변수

| 변수 | 기본값 | 의미 |
| --- | --- | --- |
| `APP_MODE` | `mock` | `live`이면 네 API 모두 501. 실제 모델 미연결을 명시하며 자동 전환하지 않음 |
| `DATASET_PATH` | `service/shared/mock/dataset.json` | 실행 위치와 무관하게 소스 파일 기준으로 해석되는 기본 경로. 직접 지정할 때는 절대 경로 권장 |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | 쉼표로 구분한 허용 origin. 배포 시 실제 프런트엔드 origin 지정 |
| `RUN_STORE_MAX` | `200` | 프로세스별 저장 결과 개수. 1~10000 |
| `RUN_STORE_TTL_SECONDS` | `3600` | 실행 기록 만료 시간. 양의 정수 |

`.env.example`은 설정 예시입니다. 서버가 `.env` 파일을 자동으로 읽지는 않습니다. 셸 또는 배포 서비스의 환경변수로 설정하세요. LangSmith 추적은 이 앱에서 설정하지 않으며, 외부 추적을 원하지 않는 환경에서는 `LANGSMITH_TRACING`/`LANGCHAIN_TRACING_V2`를 활성화하지 마세요.

공유 파일은 요청 시 읽으므로 파일이 없어도 모듈 로딩과 mock health는 작동합니다. `/api/health`는 프로세스 생존 확인이며 자료 준비 상태를 보장하지 않습니다. 데이터가 없거나 형식이 잘못되면 `/api/districts`와 실행 요청은 503을 반환합니다.

## API와 실행 흐름

- `GET /api/health`: `{status: "ok", mode: "mock", graph: "langgraph"}`
- `GET /api/districts`: 검증한 전체 공유 dataset
- `POST /api/runs`: `{district_code: "공유 자료의 code", scenario: "normal"}`. 동기 실행 후 전체 RunResult 반환
- `GET /api/runs/{run_id}`: 저장된 결과. 없는 기록·만료·재시작 후 조회는 404

잘못된 시나리오·요청 형식은 422, 알 수 없는 행정동은 404입니다. 지원 시나리오: `normal`, `risk_spike`, `missing_data`, `expired_policy`, `no_policy`.

```text
START → 검증 → 시연 위험 결과 → 추가 조사 → 정책 검색 → 조건 확인 → 결과 정리 → END
          └ 자료 부족 → 판단 보류·결과 정리 → END          │
                              정책 재검색 ← 조건 불충족 ┘
                              (최대 총 2회 검색)
```

- `risk_spike`: 원래 합성 지수에 30을 더하고 99로 제한. 원인·인과관계 판단을 하지 않습니다.
- `missing_data`: 또는 실제 입력 지표 누락/품질 불량 시 점수 null, unknown, held. 정책 검색을 실행하지 않습니다.
- `expired_policy`: 첫 후보를 만료 상태로 복제하여 조건 검사에서 제외한 후 원래의 공유 정책에서 대안을 재검색합니다. 공유 파일은 수정하지 않습니다.
- `no_policy`: 빈 후보로 종료하고 담당자 확인을 안내합니다. 빈 후보 자체를 무한 재검색하지 않습니다.
- 날짜는 서버 현재 날짜가 아닌 **dataset.as_of 날짜**를 기준으로 하며 시작일·종료일을 포함합니다. 지역은 행정동 코드·행정동명·자치구명·`*`를 지원합니다. 신호 태그 교집합 개수와 정책 ID로 정렬하고 유효한 정책을 최대 3개 반환합니다.
- 모든 시나리오에서 정책이 실제로 비어 있거나 유효 대안이 없으면 정책을 만들어 채우지 않고 공백으로 종료합니다.
- 동일 입력의 내용은 결정적이며 실행 ID와 완료 시각만 달라집니다.

실행 저장소는 잠금으로 보호하는 제한된 프로세스 메모리입니다. 기본 최근 200개, 1시간 보관, FIFO 제거이며 재시작하면 삭제됩니다. 사용자별 격리·인증·영구 저장은 없는 공개 시연용입니다. **Uvicorn worker는 1개**로 실행해야 생성한 기록을 안정적으로 조회할 수 있습니다.

실제 연결 지점은 `app/graph.py`의 `demo_risk`, `investigate`, `search_policies`, `summarize`입니다. 이 함수들이 실제 모델·검증된 조사 자료·정책 공급자·선택적 LLM의 교체 지점일 뿐, 현재 live 실행은 지원하지 않습니다.

## Docker

`service/` 루트를 build context로 사용합니다. Dockerfile이 검증할 공유 파일만 포함하고 연구 자료나 가상환경은 복사하지 않습니다.

```sh
docker build -f backend/Dockerfile -t companion-backend .
docker run --rm -p 8000:8000 \
  -e APP_MODE=mock \
  -e CORS_ORIGINS=https://your-frontend.example \
  companion-backend
```

비특권 사용자로 실행하며 단일 worker와 healthcheck를 포함합니다. 작성 환경에서는 Docker daemon이 실행되지 않아 컨테이너 build/run은 검증하지 못했습니다.

## 검증 및 근거

테스트는 다섯 시나리오, 임계값, 누락 데이터 조기 중단, 만료 후보 제외·재검색, 재검색 상한, 기간·지역 조건, 결정성, 데이터 불변성, 동시 실행 상태 분리, 입력 오류, live 501, 데이터 503, CORS, 용량 제한·TTL·재시작 소실을 확인합니다.

StateGraph·compile·조건부 edge 구현은 [LangGraph 공식 Graph API 문서](https://docs.langchain.com/oss/python/langgraph/graph-api)를 확인했습니다.

# 배포 절차

기본 공개 대상은 **합성 데이터를 사용하는 정적 지도 시연**이다. GitHub Pages에는 프런트와 공개 fixture만 배포한다. FastAPI와 LangGraph는 별도 서버가 있어야 실행할 수 있다. 이 문서는 절차이며 배포 완료를 증명하는 기록이 아니다.

## 1. 배포 전에 확인할 것

- 저장소 대상은 `YunMori/bigcontest`다. 독립 저장소 루트는 로컬 `service/`이며 그 아래 `frontend/`, `backend/`, `shared/`, `docs/`가 있다. 상위 연구 폴더는 서비스 저장소에 포함하지 않는다. 아래 명령은 이 서비스 루트를 기준으로 한다.
- 배포 workflow는 저장소 루트의 [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml)이다. 기본 브랜치 `main` push와 수동 실행을 받는다.
- [QA.md](QA.md)의 빌드·API·브라우저 확인을 완료하고 커밋 SHA, 검사 결과, 사용한 환경변수를 기록한다. 문서 작성만으로 검증 항목을 통과 처리하지 않는다.
- 배포 파일에 합성 데이터만 있는지, 지리 경계 출처와 이용 조건이 기록됐는지 확인한다.

## 2. 로컬 정적 배포 형태 확인

`frontend/`에서 실행한다. workflow는 Node 22를 사용한다. 같은 버전 계열과 커밋된 lockfile을 사용한다.

```sh
npm ci
npm test
VITE_APP_MODE=mock VITE_BASE_PATH=/bigcontest/ npm run build
VITE_BASE_PATH=/bigcontest/ npm run preview -- --host 127.0.0.1
```

미리보기에서 `/bigcontest/` 경로를 연다. 기본 포트는 4173이지만 실제 출력 주소를 확인한다. `dist/index.html`, JS/CSS와 `dist/mock/dataset.json`, `dist/mock/districts.geojson`이 있어야 한다. `vite preview`는 로컬 확인용이며 운영 서버로 사용하지 않는다. [Vite 정적 배포](https://vite.dev/guide/static-deploy.html)

Vite의 프로젝트 사이트 base는 `/bigcontest/`다. 동적으로 만드는 fixture URL도 `import.meta.env.BASE_URL`을 사용해야 한다. 사이트 루트 `/`나 사용자 전용 도메인으로 바꾸면 base를 다시 설정하고 빌드한다. [Vite base 경로](https://vite.dev/guide/build#public-base-path)

## 3. GitHub Pages 최초 배포

1. 통합한 서비스와 lockfile, 저장소 루트 workflow를 GitHub에 올린다. 실제 기본 브랜치와 workflow의 push 대상 브랜치가 일치하는지 확인한다.
2. GitHub 저장소의 **Settings → Pages → Build and deployment → Source → GitHub Actions**를 선택한다. **Settings → Environments → github-pages → Deployment branches and tags**에서 실제 배포 브랜치 `main`을 허용한다. 최초 환경에 `master`만 등록돼 있으면 `main` 배포가 차단될 수 있다. 조직 정책이나 저장소 권한 때문에 변경할 수 없으면 관리자에게 해당 설정만 요청한다.
3. Actions의 Pages workflow가 다음 구성을 갖는지 확인한다. 설치·검사·빌드는 `frontend/`, npm 캐시 lockfile은 `frontend/package-lock.json`, 업로드 대상은 `frontend/dist`여야 한다. 프로젝트 base는 `/bigcontest/`, 시연 모드는 `mock`이다.
4. 빌드 후 `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`로 산출물을 게시한다. deploy job은 build 성공에 의존해야 하며 `github-pages` environment와 배포 URL 출력을 설정한다.
5. 토큰 권한은 필요한 범위로 설정한다. 저장소 읽기에 `contents: read`, Pages 게시에 `pages: write`, 배포 신원 확인에 `id-token: write`가 필요하다. 현재 workflow는 `github-pages` concurrency 그룹으로 동시 배포를 제어한다. PR 검사는 가능하지만 미검토 PR 코드를 공개 배포하지 않는다.
6. Actions에서 빌드와 배포 job이 모두 성공했는지 확인한다. 예상 주소는 `https://yunmori.github.io/bigcontest/`이나 **실제 주소는 배포 job의 `page_url` 또는 Settings → Pages로 확인**한다.
7. 실제 주소에서 새로고침하고 지도·정적 파일·다섯 시나리오·모바일 화면을 확인한다. 성공한 job만으로 사용자 화면 검증을 대신하지 않는다.

설정과 권한 근거: [GitHub Pages 사용자 정의 workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Vite의 GitHub Pages 안내](https://vite.dev/guide/static-deploy.html#github-pages). Actions 버전은 저장소 workflow에 고정된 값을 따르고 변경 시 각 action의 공식 릴리스를 확인한다.

Pages는 Python API를 실행하지 않는다. 공개 주소에 `/api/health`를 붙여 백엔드 상태를 검사할 수 없다. API 경로를 도입하려면 다음 절차로 별도 HTTPS 서버를 준비한다.

## 4. 환경변수와 공개 범위

| 변수 | 실행 위치 | 예시 / 의미 |
| --- | --- | --- |
| `VITE_APP_MODE` | 프런트 빌드 | `mock` 기본, 서버 연결 시 `api` |
| `VITE_BASE_PATH` | Vite 설정을 읽는 빌드 프로세스 | Pages `/bigcontest/`, 로컬 루트 `/` |
| `VITE_API_BASE_URL` | 프런트 빌드 | `http://127.0.0.1:8000` 또는 별도 HTTPS 서버 origin. 코드가 `/api/...`를 붙이므로 `/api`를 값에 붙이지 않음 |
| `APP_MODE` | API 서버 시작 | 현재 `mock`만 지원. `live`는 명시적 실패 |
| `DATASET_PATH` | API 서버 시작 | 기본 `shared/mock/dataset.json`. 다른 fixture를 쓸 때 절대 경로 지정 |
| `CORS_ORIGINS` | API 서버 시작 | 쉼표로 구분한 origin 목록. 기본 `http://localhost:5173` |
| `RUN_STORE_MAX` | API 서버 시작 | 기본 `200`, 메모리 기록 최대 수. 허용 1~10000 |
| `RUN_STORE_TTL_SECONDS` | API 서버 시작 | 기본 `3600`, 생성 뒤 유효 시간(초), 양수 |

`VITE_*`는 공개 번들에 포함되는 값이다. GitHub Secrets에 넣어도 프런트 빌드에서 사용하면 비밀이 되지 않는다. LLM 키, DB 암호, 관리 토큰은 서버의 비밀 환경변수에만 둔다. 프런트 환경변수를 바꾸면 다시 빌드·배포해야 하며 개발 서버는 재시작한다. [Vite 환경변수 보안](https://vite.dev/guide/env-and-mode.html)

`VITE_BASE_PATH`는 현재 계약상 `process.env`에서 읽으므로 위와 같이 빌드 명령 또는 Actions `env`로 전달한다. `.env` 파일에 적는 것만으로 Vite 설정의 `process.env`에 자동 주입된다고 가정하지 않는다.

## 5. 선택적 API 서버 배포

먼저 로컬에서 mock API와 다섯 시나리오를 확인한다. Docker의 빌드 컨텍스트에는 backend 코드와 `shared/mock/dataset.json`이 모두 포함되어야 한다. Dockerfile만 있는 폴더를 컨텍스트로 넘기면 공유 fixture 복사가 실패할 수 있다.

### 로컬 Python API

Python 3.12를 준비하고 서비스 루트에서 시작한다. 설치 과정에는 패키지 다운로드가 필요하다.

```sh
cd backend
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest -q
APP_MODE=mock CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173 .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

다른 터미널의 `frontend/`에서 실행한다.

```sh
VITE_APP_MODE=api VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

health는 `http://127.0.0.1:8000/api/health`, OpenAPI 화면은 `http://127.0.0.1:8000/docs`다. 프런트 기본 dev 주소는 `127.0.0.1:5173`이므로 백엔드 기본 CORS `localhost:5173`만 사용하면 두 주소가 다르다. 이미 5173 포트를 사용 중이어서 Vite가 다른 포트를 골랐다면 실제 포트도 CORS에 넣고 서버를 재시작한다.

`backend/.env.example`은 변수 목록이며 현재 서버가 `.env`를 자동으로 읽지는 않는다. 위처럼 프로세스 환경에 전달하거나 호스팅 환경변수 설정을 사용한다. `requirements.in`은 직접 의존성 목록, `requirements.txt`와 `requirements-dev.txt`는 현재 고정된 설치 목록이다.

### 로컬 Docker 확인

Docker 엔진이 준비된 환경에서 서비스 루트에서 실행한다.

```sh
docker build -f backend/Dockerfile -t donghaeng-api:mock .
docker run --rm --name donghaeng-api -p 8000:8000 -e APP_MODE=mock -e CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173 donghaeng-api:mock
```

현재 Dockerfile은 Python 3.12.13 기반이며 비 root 사용자로 Uvicorn 한 worker를 실행한다. 서버와 컨테이너 health check 모두 8000 포트를 사용한다. `PORT`를 자동으로 읽는 시작 명령은 없으므로 환경변수만 바꾸어 내부 listen port를 변경할 수는 없다.

### 별도 서버 예시: Render

Render 같은 Docker 호스팅을 선택할 경우의 순서다. 서비스 생성 및 요금제 선택은 별도 운영 결정이며 이 문서 작성으로 계정 설정이나 유료 서비스를 생성하지 않는다.

1. 서비스 저장소를 연결해 **Web Service**, **Docker** 런타임을 선택한다. Root Directory는 저장소 루트, Dockerfile 경로는 `backend/Dockerfile`, Docker Build Context는 `.`로 설정한다. Docker Command는 비워 현재 Dockerfile 명령을 사용한다.
2. 서버는 `APP_MODE=mock`, `PORT=8000`으로 설정한다. 현재 컨테이너는 `0.0.0.0:8000`에 고정 바인딩한다. Render 기본 `PORT`는 10000이므로 명시적으로 8000으로 맞춘다. 나중에 서버 포트를 동적으로 바꾸려면 시작 명령과 Docker health check도 함께 수정한다.
3. HTTP health check를 `/api/health`로 지정한다. 로그와 응답의 `status`, `mode`, `graph`를 확인한다. 서버 기동만으로 실제 모델이 준비됐다고 표시하지 않는다.
4. CORS 허용 origin에 `https://yunmori.github.io`를 등록한다. `/bigcontest/`는 URL 경로이므로 CORS origin에 넣지 않는다. 로컬 연결은 실제 프런트 주소의 프로토콜·호스트·포트까지 일치시킨다.
5. HTTPS API 주소를 확인한 뒤 프런트를 `VITE_APP_MODE=api`와 해당 `VITE_API_BASE_URL`로 다시 빌드한다. HTTPS Pages에서 HTTP API를 호출하면 혼합 콘텐츠로 차단될 수 있다.
6. 서버 중단과 오류 응답을 브라우저에서 확인한다. 실패가 드러나야 하며 합성 결과로 조용히 대체되어서는 안 된다.
7. 현재 실행 기록은 메모리에 있으므로 worker와 replica는 각각 하나로 둔다. 기본 200개를 초과하면 오래된 기록부터 제거하고 1시간 후 만료된다. 재시작 후 과거 `run_id` 조회 실패도 현재 설계의 한계다. 영속 저장과 인증·요청 제한을 도입하기 전에는 운영용 이력 시스템으로 사용하지 않는다.

근거: [FastAPI 컨테이너 배포](https://fastapi.tiangolo.com/deployment/docker/), [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/), [Render Docker](https://render.com/docs/docker), [Render Web Service 포트 바인딩](https://render.com/docs/web-services#port-binding). Fly.io 등 다른 제공자를 선택해도 컨테이너 내부 포트·HTTPS·health check·CORS를 같은 순서로 확인하되 해당 제공자의 설정값을 사용한다.

## 6. 재배포·롤백

재배포는 변경 검증 → 커밋 → 대상 브랜치 반영 → Actions 성공 확인 → 공개 URL 확인 순서다. Pages의 환경변수나 base를 바꾸면 새 artifact를 만들어야 한다. 단순히 브라우저 캐시만 비워서는 빌드 설정이 바뀌지 않는다.

롤백은 마지막 정상 커밋과 빌드 환경을 먼저 확인한다. 공유 브랜치의 기록을 강제로 덮기보다 문제 커밋을 되돌리는 새 커밋을 만들고 기존 배포 절차를 다시 수행한다. 과거 workflow 재실행은 당시 artifact·의존성·외부 리소스가 동일하다는 보장이 없으므로 결과를 다시 확인한다. API도 마지막 정상 이미지/커밋으로 되돌릴 수 있도록 버전을 남긴다. 현재 API 재배포는 메모리 실행 기록을 지운다.

| 증상 | 확인 순서 |
| --- | --- |
| 화면이 비거나 JS/CSS 404 | base `/bigcontest/` → artifact가 `frontend/dist`인지 → 실제 배포 URL |
| 화면은 있지만 지도/데이터가 없음 | `/bigcontest/mock/` 요청 상태 → GeoJSON·dataset 코드 일치 → 공개 파일 포함 여부 |
| Pages deploy 권한 오류 | Pages Source → `pages: write`, `id-token: write` → environment 보호 규칙 |
| API 연결 오류 | 서버 health → HTTPS → `VITE_API_BASE_URL` → CORS origin → 프런트 재빌드 여부 |
| 실행 이력 404 | 서버 재시작·재배포 → 여러 worker/replica 여부 → 저장소가 메모리인지 |

배포 확인 기록에는 커밋 SHA, UTC 또는 시간대가 있는 확인 시각, Actions 실행 링크, 공개 URL, QA 결과와 미확인 항목을 남긴다.

# 최초 공개 시연 배포 기록

- 서비스: [동행 관측소](https://yunmori.github.io/bigcontest/)
- 저장소: [YunMori/bigcontest](https://github.com/YunMori/bigcontest)
- 배포된 애플리케이션 커밋: `648a1493ae2fcdd6fa3419b6d5fc3ce69255720d`
- [GitHub Actions 배포 실행](https://github.com/YunMori/bigcontest/actions/runs/36586984356): build, backend, deploy 모두 success.
- 배포 완료: 2026-09-29 15:03:25 UTC (2026-09-30 00:03:25 KST).
- 공개 사이트 브라우저 검증 완료: 2026-09-29 15:04:11 UTC.
- 이 기록을 추가하는 후속 문서 커밋은 애플리케이션 동작을 변경하지 않는다.

## 확인한 동작

| 검사 | 결과 |
| --- | --- |
| 실제 서울 행정동 지도 | 427개 폴리곤 표시, 합성 fixture와 코드 일치 |
| 검색·선택 | 성산 검색 2개 결과, 상세 지역 동기화, 빈 결과 복구 |
| 위험 필터 | 위험 지역만 목록 표시, 전체 복구 |
| 일반 관측 | 완료, 가상 정책 3개 |
| 위험 급상승 | 시연 점수 변환, 완료, 가상 정책 3개 |
| 자료 누락 | 자료부족 표시, 점수 없음, 판단 보류, 정책 0개 |
| 정책 만료 | 만료 제외·재검색 단계, 유효한 가상 정책 3개 |
| 정책 공백 | 정책 0개, 담당자 확인 안내, 유한 종료 |
| 모바일 | 390×844 화면 가로 넘침 없음. 모바일 최초 로드도 확인 |
| 브라우저 오류 | 공개 주소에서 JavaScript pageerror 0개 |
| API 연동 | 로컬 실제 FastAPI + LangGraph 연결에서도 다섯 시나리오 통과 |
| API 오류 | HTTP 503 화면 오류 표시, mock fallback 및 가짜 정책 생성 없음 |

자동 검사: 프런트 Vitest 9개, 백엔드 pytest 46개, fixture 무결성 검사 통과. 백엔드 담당은 실제 공유 fixture의 427개 행정동 × 5시나리오 = 2,135회 API 실행도 검증했다. GitHub Ubuntu CI에서도 프런트 빌드와 테스트, 백엔드 테스트가 통과했다.

## 재현

브라우저 검사는 저장소 루트의 `scripts/browser_smoke.cjs`로 실행한다. Playwright를 설치한 환경에서 실행하며 Chrome 채널을 쓰려면 Chrome 설치가 필요하다.

```bash
# 선택: 저장소에서 제외되는 폴더에 QA 도구 설치
npm install --prefix .artifacts/qa playwright
PLAYWRIGHT_MODULE="$PWD/.artifacts/qa/node_modules/playwright" \
  BROWSER_CHANNEL=chrome \
  node scripts/browser_smoke.cjs https://yunmori.github.io/bigcontest/
```

기본 출력은 `.artifacts/browser/report.json`, `desktop.png`, `mobile.png`이며 Git에서 제외한다. 현재 시연의 브라우저 정책은 고정 가상 데이터이므로 외부 정책 검색 결과에 의존하지 않는다.

## 공개 범위와 미검증 범위

공개 배포는 GitHub Pages의 **정적 브라우저 mock**이다. 화면 타임라인은 브라우저 시뮬레이션이며 LLM·LangGraph 서버 호출이 아니다. FastAPI/LangGraph 코드는 저장소에 포함되고 로컬 API 모드에서 검증했으며 별도 서버에 공개 배포하지 않았다.

실제 고립 위험 예측 모델, 실제 정책 DB, LLM 도구 선택, 인증·영속 DB·운영 부하 검증은 아직 연결되지 않았다. Dockerfile은 제공하지만 로컬 Docker daemon이 없어 이미지 build/run을 수행하지 않았다. 합성 데이터 검증을 실제 사회적 고립이나 정책 자격의 정확도로 해석하지 않는다.

## 최초 배포 설정 조정

Pages 환경 자동 생성 시 배포 허용 목록에 `master`만 있어 `main` 배포가 거부됐다. 다른 보호 설정을 제거하지 않고 `main`을 허용 목록에 추가한 후 실패 작업을 재실행해 완료했다. 이후에는 `main` push → 자동 검사 → Pages 배포 순서로 갱신된다.

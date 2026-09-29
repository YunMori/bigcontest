# 동행 관측소

행정동별 위험 신호를 지도에서 확인하고, 지역 지표 조사와 정책 후보 탐색 과정을 보여주는 사회적 고립 대응 지원 서비스입니다.

**현재는 모델 개발 전 mockup입니다.** 서울의 실제 행정동 경계 위에 **합성 위험점수·인구·활동 지표·가상 정책**을 표시합니다. 실제 주민의 고립 상태나 정책 수급 자격을 판단하지 않습니다. 기존 연구 데이터는 사용하지 않았습니다.

## 공개 시연

- 배포 주소: <https://yunmori.github.io/bigcontest/>
- 저장소: <https://github.com/YunMori/bigcontest>
- 서울 행정동 427개, 2026-07-01 경계 스냅샷. 시연 기준일 2026-09-29.
- API 키·로그인·별도 서버 없이 동작하는 브라우저 mock 모드.
- 기본 관측 / 위험 급상승 / 자료 누락 / 정책 만료 / 정책 공백 시나리오.
- 2026-09-30 KST 공개 배포 및 실제 주소의 브라우저 검증 완료. [릴리스·검증 기록](docs/RELEASE.md)

## 로컬 실행

Node.js 22 이상을 사용합니다.

```bash
cd frontend
npm ci
npm run dev
```

표시되는 로컬 주소를 열고 행정동을 선택한 뒤 시나리오를 실행합니다. 위험도 변화, 판단 보류, 만료 정책 제외·재검색, 정책 공백을 확인할 수 있습니다.

```bash
npm test
npm run build
npm run preview
```

백엔드 실행·Docker·환경변수는 [배포 안내](docs/DEPLOYMENT.md)를 참조하세요.

## 역할과 실행 모드

| 구성 | 현재 구현 | 실제 서비스 전환 시 |
|---|---|---|
| 위험 결과 | 재현 가능한 합성 데이터와 시나리오 변환 | 독립적으로 검증한 예측 모델 연결 |
| 지도·상세 화면 | React / TypeScript / Leaflet | 같은 결과 계약 유지 |
| 브라우저 mock | TypeScript 시뮬레이터 | 프런트 `api` 모드로 전환 |
| API mock | FastAPI / 실제 LangGraph 그래프, 결정적 분기 | LLM의 도구 선택과 모델 호출 연결 |
| 정책 | 명시적으로 표시한 가상 정책 6개 | 출처·대상·기간을 확인한 정책 DB |
| 저장 | 브라우저 상태, 서버의 제한된 메모리 실행 기록 | 인증·DB·영속 체크포인트 |

**GitHub Pages는 정적 프런트엔드만 실행합니다.** 공개 화면의 타임라인은 브라우저 시뮬레이션이며 서버에서 LangGraph나 LLM이 실행되고 있다는 뜻이 아닙니다. LangGraph 실행은 별도로 백엔드를 실행한 API 모드에서 확인합니다. 실제 모델 미연결 상태에서 live 모드가 mock로 자동 대체되지 않도록 구성합니다.

## 문서

- [기술 스택을 선택한 이유와 아키텍처](docs/ARCHITECTURE.md)
- [배포 순서와 mock → API → 실제 모델 전환](docs/DEPLOYMENT.md)
- [검증 체크리스트](docs/QA.md)
- [프런트·백엔드 공통 데이터 계약](docs/CONTRACT.md)
- [지도 출처·합성 데이터 생성 방법](docs/DATA.md)

## 구조

```text
frontend/          지도, 상세 화면, 브라우저 mock 실행기
backend/           FastAPI, LangGraph, 시나리오 테스트, Dockerfile
shared/mock/       실제 경계, 합성 관측값, 가상 정책, 출처·라이선스
scripts/           재현 가능한 데이터 생성·무결성 검사
docs/              구조, 배포, 검증, 공통 계약
.github/workflows/ 빌드·검증·Pages 배포
```

## 지도 출처

본 데이터는 통계청 통계지리정보서비스([SGIS](https://sgis.kostat.go.kr))에서 공공누리 제1유형으로 개방한 행정동 경계를 가공한 것이며(가공: [vuski/admdongkor](https://github.com/vuski/admdongkor)), CC BY 4.0으로 배포됩니다. 서울 지역 선택, 속성명 표준화, 좌표 반올림을 적용했습니다. [원 출처의 데이터 라이선스](shared/mock/BOUNDARY-LICENSE.txt)를 유지합니다.

# 지도와 시연 데이터

## 공간 단위

- 서울특별시 행정동 427개, 25개 자치구.
- 경계 버전: 2026-07-01. 현재 실제 행정구역과 항상 일치한다고 보증하지 않는다.
- 코드: 원자료 `adm_cd2`, 행정안전부 행정동코드 10자리 문자열. 법정동 코드와 혼용하지 않는다.
- 지도: GeoJSON Polygon/MultiPolygon, EPSG:4326 경도·위도 순서.
- 출처: [vuski/admdongkor 고정 커밋](https://github.com/vuski/admdongkor/tree/dd1881663fcabc69b81393604e91ebf3a4202e9a/ver20260701).
- 원 데이터의 출처: SGIS, 공공누리 제1유형. 가공 경계는 CC BY 4.0.
- 변경: 서울만 선택, `code/name/district` 속성 표준화, 좌표를 소수점 5자리로 반올림. 경계 데이터의 조사·측량 정확도를 주장하지 않는다.

## 합성값의 의미

`dataset.json`의 위험도, 인구, 활동 지표, 변화율, 추세는 실제 관측값이 아니다. 행정동 코드의 SHA-256을 이용해 재현 가능한 값으로 생성했다. 가상 점수는 확률이 아니고, 정상(<40)·관심(40~69)·위험(70 이상) 기준도 시연 전용이다. 실제 모델 학습이나 위험도의 타당성을 검증한 결과가 아니다.

정책 6개도 모두 가상이다. 실제 정책명·접수처·출처를 꾸며 넣지 않았다. `is_mock=true`, `source_url=null`, `[가상]` 제목을 사용한다. 시연 기준일(2026-09-29)에 5개는 유효하고 1개는 만료되도록 설정했다. 실행 시계의 실제 날짜 대신 데이터 기준일로 유효기간을 비교해 시연을 재현한다.

원본 연구 데이터, 대회 제공 원자료, 개인 식별 정보는 포함하지 않는다. 행정동 수준의 상태를 개인의 고립 여부나 정책 자격으로 해석하지 않는다.

## 재생성

원 GeoJSON을 [고정 URL](https://raw.githubusercontent.com/vuski/admdongkor/dd1881663fcabc69b81393604e91ebf3a4202e9a/ver20260701/HangJeongDong_ver20260701.geojson)에서 받은 뒤 저장소 루트에서 실행한다.

```bash
python3 scripts/build_mock_data.py /path/to/HangJeongDong_ver20260701.geojson
python3 scripts/check_mock_data.py
```

원본 해시·경계 버전·가공 내역은 `shared/mock/provenance.json`에 기록된다. 빌드 시 외부 경계 서버를 호출하지 않고 저장소에 포함된 파일을 사용한다.

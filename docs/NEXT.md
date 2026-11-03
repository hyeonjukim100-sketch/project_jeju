# 이어서 할 일 (인수인계 메모)

## 내일(2026-11-03) 순서대로 할 일
오늘 Vercel에 GitHub 저장소 import까지 끝냄. 아래를 위에서부터 차례로 진행한다.

0. 먼저 확인: 버스 정류장 단위 안내가 가능한지 제주도청 공개 자료 https://www.jeju.go.kr/help/open.htm?act=view&seq=967654 부터 열어 본다 (정류소 위치·경유 노선 API 또는 데이터가 있는지). 지금 쓰는 노선 API에는 정류장 목록·좌표가 없다. 대안 후보는 국토교통부 정류소 정보 API(15098534, 제주 도시코드 포함 여부 미확인). 시연 전에 넣기 어려우면 발표에서 "정류장 단위 안내는 다음 단계"로 소개한다.
1. Vercel 배포 마무리: 환경변수 입력(`JEJU_BUS_KEY`, Gemini/Kakao/Supabase 키 등 `.env.example` 목록 기준, 값은 채팅에 붙이지 않기), 배포 후 `/api/*` 동작 확인, Supabase Site URL·Redirect URL을 배포 주소로 추가
2. README.md 정리 (예쁘게: 소개, 기능, 사용한 공공 API 3개+, AI 에이전트 도구 설명, 실행 방법, 배포 주소, 크레딧)
   - 크레딧: Fluent emoji MIT(버스 포함), OpenStreetMap, Open-Meteo, 기상청, Visit Jeju, 제주데이터허브 버스, AWS Terrain/SRTM, LINE Seed Sans KR OFL, Kakao, Leaflet
3. QR 코드 만들기 (배포 주소 → QR 이미지, 발표 자료와 README에 사용)
4. 모바일 점검 및 모바일 환경 맞추기 (챗 코스 카드, 세부 지도, 동선 목록, 여행 기록, 채팅창 폭 380px 모바일 동작)
5. 휴대폰 사파리에서 앱처럼 쓰기 (PWA: manifest, 아이콘, 홈 화면에 추가 안내, apple-touch-icon, theme-color)
6. OG 만들기 (og:title/description/image, 카카오톡·링크 미리보기 이미지 1200x630)
7. 디자인 리체크 (글자 위치 규칙 준수: 위치·줄 간격만 조정, 다른 디자인은 건드리지 않기. 메모리 `jeju-design-rules` 참고)
8. 시연 영상 제작 및 발표 준비 (발표 자료, 시연 순서: 기분 슬라이더 → 지도/동선 → AI 여행 계획 → 버스 도구 → 위험 문구 안내)

## 리디자인 (브랜치 `redesign-spot-route`, 2026-11-03)
설계 `docs/superpowers/specs/2026-11-03-spot-route-redesign-design.md`, 계획 `docs/superpowers/plans/2026-11-03-spot-route-redesign.md`.
- 장소 설명: 사진 히어로 + 둥근 카드(칩·굵은 이름·작은 귤 점수·굵은 한 줄·3줄 접기). 모바일은 핀을 누르면 화면 전체 (`SpotDetail.jsx`)
- 동선: 카드형(활동 이름·머무는 시간·이동 칩), 제목은 장소 종류에서 짓고 끝말은 기분에 따라 바뀜 (`src/lib/routeTitle.js`). 챗 코스 카드에도 적용
- 버스 구간 "세부정보" 탭: 직행 노선·승하차 정류장·다음 버스 분 (`/api/bus-leg`, `server/busLeg.js`, 비공식 도청 API라 발표 직전 재확인)
- 시험: `npm test`(node:test, 순수 로직만)
- 알려진 것: 직행만 찾음(환승 없음), 굵은 한 줄은 첫 문장이 60자 이내일 때만, 콘솔의 React "synchronously unmount a root" 오류는 리디자인 이전부터 있음(3D 쪽)

## 지금까지 된 것 (최근, 커밋 63e5671 푸시됨)
- 여행 계획 챗 "함께 여행 계획 세우기": 누구와 → 이동 수단 → 걷는 정도 → 하고 싶은 것 → 코스 카드 (`src/components/ChatFab.jsx`, `server/plan.js`, `api/plan.js`)
- 코스 카드: 장소별 "+ 담기", "이 코스를 내 동선에 담기"
- 동선에 이동 수단 선택(자동차·걷기·버스), 버스는 제주버스정보시스템 링크 (`Explore.jsx`)
- (11-03) 버스 정류소 도구 추가: `find_bus_stops_near`(관광지 좌표 600m 안 정류소), `get_bus_arrivals`(정류소 예상 도착 분). 제주버스정보시스템 누리집 내부 API `https://bus.jeju.go.kr/data/search/*` (POST, 키 없음, 비공식이라 발표 직전 재확인). 0번 확인 끝. 챗 시험함(성산일출봉·협재 질문에 도구 호출 확인). 장소 위치는 카카오 `findPlace` 우선(반경 1km)
- 관광지 좌표 보정 완료(`server/tour.js` `FIXES`): 성산일출봉·산방산·산방굴사 좌표 덮어쓰기, 삼양방파제 숨김. 지도에서 성산일출봉 핀이 동쪽 끝으로 옮겨진 것 확인. 다른 장소도 틀린 곳이 더 있을 수 있음
- 좌표 전수 검토(`docs/coord-check.md`): 990곳 중 카카오 검색 없음 250, 5km 넘게 차이 112(이름 비슷 76). 삼성혈·화북비석거리·삼화포구·성읍민속마을·비자림 등 유명 장소도 틀림 → 이름·종류·주소가 맞는 18곳 추가 보정함(`tour.js` `FIXES`, 총 21곳). 오름·행사·이름이 겹치는 곳과 판단 보류는 그대로(표만 남김)
- 챗 버스 답변 형식: 정류소별 줄바꿈 + "N번 버스가 약 N분 뒤" (`server/agent.js` 프롬프트), 같은 번호는 가장 빠른 1대만(`server/bus.js`)
- 알려진 한계: 챗의 버스 안내는 "공항→목적지" 같은 환승·방향 판단은 못 함
- 버스 노선 API 도구 `search_bus_routes` (`server/bus.js`, 키 `JEJU_BUS_KEY`, 하루 1000회 → 24시간 캐시)
- 위험 문구: 여행 기록은 안내가 바로 뜨고 두 번 눌러야 저장, 문구·📞 다정하게
- 채팅창: 너비 380px, 안내 "저장되지 않아요/새로고침하면 사라져요", "그만할래요" 안내, AI 말풍선에 몽숨이 얼굴(연속이면 첫 번째만), 추천 질문 5개(버스·쉬어 가기 추가), "새로 시작" 버튼
- 글자 위치 다듬기 CSS (`theme.css` 맨 아래)

## 확인 못 한 것
- 로그인이 필요한 화면(여행 기록 위험 문구 2단계 저장)
- 챗 위험 문구 카드(📞)와 자유 입력 중 위험 문구 처리
- 새 추천 질문 두 개의 AI 답변, 특히 "지치고 힘들 때"가 위험 문구로 오인되지 않는지
- 얼굴이 들어간 코스 카드 말풍선의 줄 접힘
- 모바일 화면 전반
- 계획 흐름에서 직접 쓴 말은 보기와 맞을 때만 인식함 ("기타" 입력 없음)

## 그 밖에 남은 일 (여유 있으면)
- 슬라이더에 따라 몽숨이 동작 바꾸기 (지금은 항상 wave)
- Gemini → Claude 교체 (`server/llm/claude.js`, ANTHROPIC_API_KEY)
- 300자 제한 서버 쪽 검증, 버스 정류소 좌표 API 추가 검토
- Ponytail 스킬 정리

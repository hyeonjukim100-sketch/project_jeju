# 장소·동선 화면 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 장소 설명을 사진 중심 둥근 카드(모바일은 전체 화면)로, 동선을 카드형으로 바꾸고, 동선 제목을 특징으로 짓고, 버스 구간에 "세부정보"를 붙인다.

**Architecture:** 순수 로직(제목 짓기, 소개글 나누기, 직행 노선 맞추기)은 `node --test`로 시험하는 작은 모듈로 분리한다. 화면은 `Explore.jsx`에서 `SpotDetail`, `ClampText`, `Gallery`를 꺼내 쓰고, 동선 카드와 버스 세부정보는 `Explore.jsx`의 `RouteList` 안에서 바꾼다. 스타일은 `theme.css` 맨 아래 한 구간에 모은다. 버스 구간 데이터는 새 `/api/bus-leg`가 만든다.

**Tech Stack:** React 19, Vite, Zustand, Bootstrap Icons, `node:test`(새로 추가, 별도 설치 없음), 제주버스정보시스템 비공식 API(`https://bus.jeju.go.kr`).

**Spec:** `docs/superpowers/specs/2026-11-03-spot-route-redesign-design.md` (구현자는 이 문서도 함께 읽는다)

## Global Constraints

- 색 토큰(`src/lib/season.js` 팔레트), 몽숨이, 3D 지도, 챗 창 디자인은 바꾸지 않는다. 새 색을 만들지 않고 `var(--bg|surface|soft|accent|strong|strong-ink|ink|sub|line)`만 쓴다.
- 새 스타일은 `src/styles/theme.css` 맨 아래에 `/* 리디자인 (2026-11-03) */` 구간으로 모은다. 한글 줄바꿈은 `word-break: keep-all; overflow-wrap: anywhere;`를 유지한다.
- 모바일 기준 너비는 `max-width: 640px`(기존 `theme.css`와 같음). 장소 설명 전체 화면 전환은 이 너비 이하에서만이다.
- 설명 접기는 3줄(`-webkit-line-clamp: 3`), 한 줄 설명은 40자까지, 모바일·데스크톱 모두 적용.
- 기분 칩 이름: 0 "많이 지친 날", 1 "가라앉은 날", 2 "보통의 하루", 3 "괜찮은 하루", 4 "활기찬 하루".
- 제목 끝말: 0 "…에서 쉬어 가기", 1 "… 천천히 거닐기", 2 "… 느끼기", 3 "… 즐기기", 4 "…에서 신나게 놀기". 기분 없음(내 동선)은 칩 없이 "… 느끼기". 낱말을 하나도 못 뽑으면 "제주 둘러보기"(끝말 없음).
- 리뷰가 없으면 이름 아래에 "아직 리뷰가 없어요"만 작게. 점수 표시는 `🍊 3.0 · 마음지도 리뷰 12개`(작은 글씨).
- 기존 기능을 지우지 않는다: 동선에 담기, 찜, 근처 카페·식당(`Nearby`), 사진 갤러리와 출처 표시, 리뷰 쓰기·수정(`ReviewBox`), 동선 순서 바꾸기·빼기, 이동 수단 선택.
- 서버 코드는 ESM이고 키를 로그나 응답에 싣지 않는다. 새 API는 키 없이 도청 사이트 주소만 쓰고, 실패하면 빈 결과로 응답한다.

## Review Focus

- 동선이 0곳·1곳이거나 종류가 전부 낱말 없는 경우 → 제목은 "제주 둘러보기"로 깨지지 않는다. (Task 1)
- 소개글이 비었거나 마침표 없이 매우 긴 경우, 문장이 하나뿐인 경우 → 굵은 줄과 설명이 비거나 겹치지 않는다. (Task 2)
- 위치(lat/lng)·사진·리뷰가 없는 장소, 카카오에서 온 식당·카페 항목 → 장소 설명 화면이 비거나 깨지지 않는다. (Task 4)
- 버스 구간에서 직행이 없음·API 시간 초과·좌표 없는 항목 → "직접 가는 버스를 찾지 못했어요" 안내가 뜨고 화면은 멈추지 않는다. (Task 3, 6)
- 세부정보를 연 채로 이동 수단을 바꾸거나 순서를 바꾸거나 항목을 뺄 때 → 열림 상태가 엉뚱한 구간에 붙지 않는다. (Task 6)

## File Structure

| 파일 | 역할 |
|---|---|
| `src/lib/routeTitle.js` (+ `.test.js`) | 종류→낱말, 활동 이름, 와/과, 동선 제목·기분 칩 |
| `src/lib/spotText.js` (+ `.test.js`) | 소개글 나누기, 카테고리 칩 이름 |
| `src/lib/useIsMobile.js` | `max-width: 640px` 여부 훅 |
| `src/components/Gallery.jsx` | `Explore.jsx`에서 옮긴 사진 갤러리 + `usePhotos` |
| `src/components/ClampText.jsx` | 3줄 접기 + 더보기 |
| `src/components/SpotDetail.jsx` | 장소 설명 화면(사진 히어로 + 둥근 카드), 모바일은 전체 화면 |
| `src/components/BusLegDetail.jsx` | 버스 구간 세부정보 펼침 |
| `server/busLeg.js` (+ `.test.js`) | 구간 직행 노선 찾기 |
| `server/bus.js` | 정류장 노선·노선 정류장 조회 추가 |
| `api/bus-leg.js` | `GET /api/bus-leg` |
| `src/api/client.js` | `fetchBusLeg` 추가 |
| `src/components/Explore.jsx`, `ChatFab.jsx`, `FavButton.jsx`, `src/styles/theme.css` | 연결과 스타일 |

---

### Task 1: 제목 짓기 로직 + 시험 환경

**Files:**
- Create: `src/lib/routeTitle.js`, `src/lib/routeTitle.test.js`
- Modify: `package.json` (scripts에 `"test": "node --test"` 추가)

**Interfaces:**
- Produces:
  - `kindWord(stop: { kind?: string, type?: 'spot'|'meal'|'rest', title?: string }): string | null`
  - `activityName(stop): string`
  - `withParticle(word: string): string` (받침 있으면 "과", 없으면 "와"를 붙여 돌려줌)
  - `routeTitle(stops: Array<stop>, moodLevel: number | null): { chip: string | null, title: string }`
  - `MOOD_CHIP: string[]` (길이 5)

- [ ] **Step 1: 실패하는 시험 작성** (`routeTitle.test.js`, `node:test` + `node:assert/strict`)
  - `withParticle('숲')==='숲과'`, `withParticle('바다')==='바다와'`, `withParticle('시장 구경')==='시장 구경과'`, 한글이 아닌 끝 글자(`'abc'`)는 "와".
  - `kindWord({type:'rest'})==='쉼'`, `kindWord({type:'meal'})===null`, `kindWord({kind:'문화유적'})==='옛 이야기'`, `kindWord({kind:'올레코스'})==='걷는 길'`, `kindWord({kind:'자연',title:'광치기해변'})==='바다'`, `kindWord({kind:'자연',title:'사려니숲길'})==='숲'`, `kindWord({kind:'자연',title:'용머리'})==='자연'`, `kindWord({kind:'기타',title:'x'})===null`.
  - 사려니숲길·제주곶자왈도립공원(둘 다 자연→숲)과 광치기해변(자연→바다)으로 `routeTitle(stops, 2)` → `{ chip:'보통의 하루', title:'숲과 바다 느끼기' }`; 같은 동선 `0` → `'숲과 바다에서 쉬어 가기'`, `1` → `'숲과 바다 천천히 거닐기'`, `3` → `'숲과 바다 즐기기'`, `4` → `'숲과 바다에서 신나게 놀기'`, `null` → `{ chip:null, title:'숲과 바다 느끼기' }`.
  - 종류 수가 같으면 먼저 나온 것이 앞: `[시장, 오름]` → `'시장 구경과 오름 느끼기'`.
  - `routeTitle([], 2)` → `{ chip:'보통의 하루', title:'제주 둘러보기' }`; `routeTitle([{kind:'기타',title:'x'}], 3)` → title `'제주 둘러보기'`; 한 곳뿐 `[{kind:'오름',title:'용눈이오름'}]`, 3 → `'오름 즐기기'`.
  - `activityName`: 자연(숲)→"천천히 걷기", 바다→"바다 소리 듣기", 오름→"오름 천천히 오르기", 트레일·올레코스→"길 따라 걷기", 문화→"이야기 둘러보기", 예술→"전시 둘러보기", 시장→"구경하며 먹기", type meal→"식사하기", type rest→"차 한 잔 쉬어가기", 그 밖에→"천천히 둘러보기".
- [ ] **Step 2: 실패 확인** — Run: `npm test` / Expected: FAIL (`routeTitle.js` 없음)
- [ ] **Step 3: 구현** — `routeTitle.js`. 종류→낱말 표: 자연·생태공원은 제목에 숲·곶자왈·휴양림·수목원이 있으면 "숲", 해변·포구·바다·항·해안이 있으면 "바다", 아니면 "자연"; 오름→"오름"; type rest→"쉼"; 시장→"시장 구경"; 문화·문화유적·유적·박물관·사찰→"옛 이야기"; 예술→"전시"; 트레일·지질트레일·올레코스→"걷는 길"; 나머지와 type meal은 null. 낱말 세기는 첫 등장 순서를 유지한 `Map`에서 개수 내림차순(동률은 먼저 나온 순) 상위 2개. 받침 판별은 `(code - 0xAC00) % 28 !== 0`(한글 음절 범위일 때만). `MOOD_CHIP`과 끝말 표는 Global Constraints 값 그대로.
- [ ] **Step 4: 통과 확인** — Run: `npm test` / Expected: 모든 시험 PASS
- [ ] **Step 5: Commit** — `git add package.json src/lib/routeTitle.js src/lib/routeTitle.test.js && git commit -m "feat: route title generator with mood endings"`

---

### Task 2: 소개글 나누기와 카테고리 이름

**Files:**
- Create: `src/lib/spotText.js`, `src/lib/spotText.test.js`

**Interfaces:**
- Consumes: `KIND_GROUP` from `src/lib/moods.js`
- Produces:
  - `splitIntro(text: string, max = 40): { lead: string, rest: string }`
  - `categoryLabel(spot: { kind?: string, type?: string }): string`

- [ ] **Step 1: 실패하는 시험 작성**
  - `splitIntro('붉은오름에서 물찻오름까지 이어지는 길이에요. 여름에도 시원해요.')` → `lead:'붉은오름에서 물찻오름까지 이어지는 길이에요.'`, `rest:'여름에도 시원해요.'`
  - 문장이 하나뿐이면 `rest:''`. `splitIntro('')` → `{ lead:'', rest:'' }`. `splitIntro(null)`도 같음.
  - 마침표 없이 60자(`'가'.repeat(60)`) → `lead:'가'.repeat(40)+'…'`, `rest:`는 원문 전체(내용을 잃지 않는다).
  - 줄바꿈도 문장 끝으로 본다: `'첫 줄\n둘째 줄'` → `lead:'첫 줄'`, `rest:'둘째 줄'`. 구분자는 `.` `!` `?` `。` 와 줄바꿈.
  - `categoryLabel({type:'meal'})==='식당'`, `({type:'rest'})==='카페'`, `({kind:'문화유적'})==='문화'`, `({kind:'사찰'})==='문화'`, `({kind:'자연'})==='자연'`, `({kind:'기타'})==='기타'`, `({})==='기타'`.
- [ ] **Step 2: 실패 확인** — Run: `npm test` / Expected: FAIL
- [ ] **Step 3: 구현** — `spotText.js`. `categoryLabel`은 type → `KIND_GROUP[kind] || kind || '기타'`. `moods.js`를 불러올 때 시험이 실패하면 `moods.js`에 시험을 막는 import가 없는지 확인한다(현재는 순수 상수).
- [ ] **Step 4: 통과 확인** — Run: `npm test` / Expected: PASS
- [ ] **Step 5: Commit** — `git add src/lib/spotText.js src/lib/spotText.test.js && git commit -m "feat: split intro text and category label helpers"`

---

### Task 3: 버스 구간 데이터 (서버)

**Files:**
- Modify: `server/bus.js` (export `bisPost`; 추가: `getStopRoutes`, `getRouteStops`)
- Create: `server/busLeg.js`, `server/busLeg.test.js`, `api/bus-leg.js`
- Modify: `src/api/client.js` (`fetchBusLeg`)

**Interfaces:**
- Produces (`server/bus.js`):
  - `getStopRoutes(stationId: string): Promise<Array<{ routeId: number, number: string, to: string }>>` — `getArriveScheduleByStationId`의 `routeInfoList` 전체(운행 중 여부 무관). 24시간 캐시.
  - `getRouteStops(routeId: number): Promise<Array<{ id: number, name: string, ord: number }>>` — `GET https://bus.jeju.go.kr/api/searchBusRouteStationList.do?route_id=` (`STATION_ID`, `STATION_NM`, `STATION_ORD`). 24시간 캐시.
- Produces (`server/busLeg.js`):
  - `findDirectRoutes({ board, alight, routesAtBoard, routeStops }): Option[]` — 순수 함수. `board`/`alight`: `Array<{id,name,meters}>`, `routesAtBoard`: `{ [boardStopId]: Array<{routeId,number,to}> }`, `routeStops`: `{ [routeId]: Array<{id,name,ord}> }`. 같은 `routeId`에서 승차 ord < 하차 ord인 것만. 번호(`number`)가 같은 것은 가장 좋은 것 하나만. 정렬: (정류장 수 + (승차 meters + 하차 meters)/100) 오름차순, 최대 3개.
  - `getBusLeg(from: {lat,lng}, to: {lat,lng}): Promise<{ options: Option[] }>` — `getStopsNear(lat,lng,1000)` 각 상위 3곳, 승차 후보 정류장마다 `getStopRoutes`, 노선별 `getRouteStops`, `findDirectRoutes`, 그리고 각 항목에 `nextMin`(승차 정류장의 `getStopArrivals(...).routes`에서 같은 번호의 `minutes`, 없으면 `null`).
  - `Option = { number: string, to: string, board: {id,name,meters}, alight: {id,name,meters}, stops: number, nextMin: number | null }`
- Produces (`api/bus-leg.js`): `GET /api/bus-leg?fromLat=&fromLng=&toLat=&toLng=` → `200 { options: Option[] }`; 값이 숫자가 아니면 `400`; 내부 실패는 `200 { options: [] }`.
- Produces (`client.js`): `fetchBusLeg(from: {lat,lng}, to: {lat,lng}): Promise<{ options: Option[] }>` (기존 `fetch*` 함수들의 에러 처리 방식을 따른다).

- [ ] **Step 1: 실패하는 시험 작성** (`busLeg.test.js`, `findDirectRoutes`만)
  - 노선 1: 정류장 10(ord1), 11(ord2), 12(ord3). 노선 2: 12(ord1), 10(ord2). 승차 후보 `[{id:10,name:'A정류장',meters:120}]`, 하차 후보 `[{id:12,name:'B정류장',meters:80}]`, `routesAtBoard={10:[{routeId:1,number:'101',to:'X'},{routeId:2,number:'202',to:'Y'}]}` → 결과는 노선 1 하나, `stops===2`, `number==='101'`, `board`/`alight`가 입력과 같음.
  - 방향이 거꾸로인 노선만 있으면 `[]`. 후보가 비어 있으면 `[]`.
  - 같은 번호 두 노선(방향 ID만 다름)이 모두 맞으면 하나만. 4개 이상 맞으면 3개로 자름.
- [ ] **Step 2: 실패 확인** — Run: `node --test server/busLeg.test.js` / Expected: FAIL
- [ ] **Step 3: 구현** — 위 인터페이스대로. 네트워크 호출은 동시 6개 이하로 제한하고 노선 정류장 조회는 `routeId`로 중복 제거한다. 모든 `fetch`는 기존 `bisPost`처럼 8초 시간 제한.
- [ ] **Step 4: 시험 통과 확인** — Run: `npm test` / Expected: PASS
- [ ] **Step 5: 실제 호출 확인** — Run: `node --env-file=.env.local --input-type=module -e "import('./server/busLeg.js').then(async m=>console.log(JSON.stringify(await m.getBusLeg({lat:33.4591,lng:126.9405},{lat:33.4750,lng:126.9345}))))"` / Expected: `options` 배열(비어 있어도 오류 없이 끝남), 항목이 있으면 모든 항목에서 `board.id !== alight.id`.
- [ ] **Step 6: Commit** — `git add server api src/api/client.js && git commit -m "feat: bus leg detail API (direct routes between two places)"`

---

### Task 4: 장소 설명 화면 (사진 히어로 + 둥근 카드)

**Files:**
- Create: `src/components/Gallery.jsx`, `src/components/ClampText.jsx`, `src/components/SpotDetail.jsx`, `src/lib/useIsMobile.js`
- Modify: `src/components/Explore.jsx`, `src/components/FavButton.jsx`, `src/styles/theme.css`

**Interfaces:**
- Consumes: `splitIntro`, `categoryLabel` (Task 2), `ratingsFor` (`src/lib/reviews.js`), `fetchPhotos`
- Produces:
  - `usePhotos(spot): { photos: Array<{url,credit,source}> | null }` and default `Gallery({ spot })` (`Explore.jsx`의 기존 `Gallery`를 그대로 옮김, 동작 변화 없음).
  - `ClampText({ text: string, lines?: number })` — 기본 3줄. 실제로 넘칠 때만 "더보기 ⌄"/"접기 ⌃" 버튼을 보인다(`ResizeObserver`로 `scrollHeight > clientHeight` 판단).
  - `useIsMobile(): boolean` — `window.matchMedia('(max-width: 640px)')`, 변화에 반응.
  - `SpotDetail({ spot, onBack, onAdd })` — `onBack(): void`, `onAdd(): void`.
  - `FavButton`에 `variant?: 'chip' | 'round'` (기본 `'chip'`, `'round'`는 글자 없이 하트만 있는 동그란 버튼, `aria-label="찜"` 유지).

- [ ] **Step 1: `Gallery`를 `Gallery.jsx`로 옮기고 `Explore.jsx`는 import로 바꾼다** (`Nearby`는 `Explore.jsx`에 그대로). 사진 상태 로직은 `usePhotos`로 뽑는다.
- [ ] **Step 2: `ClampText`, `useIsMobile` 작성.** 스타일은 `.clamp-text`(줄 수는 인라인 CSS 변수 `--lines`), 버튼 `.clamp-more`(색 `var(--strong)`가 아니라 글자색 `var(--ink)`에 밑줄 없이 굵게).
- [ ] **Step 3: `SpotDetail` 작성.** 구조(위→아래): 히어로(`usePhotos`의 첫 사진을 `<img>`로, 사진이 없거나 불러오는 중이면 종류 이모지+`var(--soft)` 그라데이션과 작은 안내 "이곳의 사진은 아직 없어요"; 왼쪽 위 둥근 뒤로가기 `onBack`, 오른쪽 위 `FavButton variant="round"`) → 둥근 카드(위쪽 모서리 28px, 히어로를 24px 덮음)에 `.chip`으로 `categoryLabel(spot)` → 굵은 이름 → 주소(작게) → 작은 점수 줄(`ratingsFor([spot.id])`로 가져온 값, 없으면 "아직 리뷰가 없어요") → 굵은 `lead` → `ClampText`(`rest`, `rest`가 비면 생략) → `동선에 담기`(`btn-soft`) → `Nearby` → 사진 출처 한 줄(작게) → `ReviewBox`. 점수 줄은 `<CitrusRating>`을 쓰지 않고 `🍊`(Emoji `tangerine`)+글자로 작게. `useIsMobile()`이 참이면 `createPortal(…, document.body)`로 `.spot-full`(전체 화면, 세로 스크롤)에 그리고, 거짓이면 제자리에서 그린다. `Nearby`는 `Explore.jsx`에 그대로 두고, `SpotDetail`이 `children`을 받아 카드 안 설명 아래에 그린다(`Explore.jsx`가 `<SpotDetail …><Nearby spot={spot} /></SpotDetail>`로 넘김).
- [ ] **Step 4: `Explore.jsx`의 장소 설명 블록(약 520~546줄의 `spot ? (...)` 분기)을 `SpotDetail`로 교체.** `onBack={() => selectSpot(null)}`, `onAdd`는 기존 `addStop({ type: 'spot', title, kind, address, lat, lng, tourId })` 호출을 그대로. 기존 "목록으로" 칩은 데스크톱에서 `onBack`과 같은 동작으로 카드 위에 남긴다(모바일 전체 화면에서는 뒤로가기 버튼이 대신한다).
- [ ] **Step 5: 스타일.** `theme.css` 맨 아래 새 구간에 `.spot-hero`, `.spot-sheet`, `.spot-full`(`position: fixed; inset: 0; z-index`는 `.glass-panel`(20)보다 크고 `.chat-fab`보다 작게 — `.chat-fab`의 z-index를 읽어서 정한다; 바탕 `var(--bg)`), `.round-btn`(44px 이상 터치 영역, `var(--surface)` 92% 불투명, `var(--shadow-soft)`), `.clamp-text`.
- [ ] **Step 6: 확인(브라우저).** `npm run dev` 후 앱 브라우저에서: ① 데스크톱 너비에서 장소 하나를 눌러 패널 안에 새 카드가 나오고 동선에 담기·찜·리뷰·근처 카페가 모두 동작 ② 창 너비를 375로 줄이고(`resize_window` mobile 프리셋) 핀을 누르면 화면 전체가 설명으로 바뀌고 뒤로가기로 지도에 돌아옴 ③ 긴 소개글이 3줄에서 끊기고 더보기로 펼쳐지며, 짧은 소개글(예: 문장 하나)에는 더보기가 없음 ④ 사진이 없는 장소와 리뷰가 없는 장소에서 깨짐 없음 ⑤ 콘솔 오류 없음. Expected: 모두 충족. 다 마치면 `resize_window` desktop으로 되돌린다.
- [ ] **Step 7: Commit** — `git add src && git commit -m "feat: photo-hero spot detail card, full screen on mobile"`

---

### Task 5: 동선 카드형 화면 + 제목

**Files:**
- Modify: `src/components/Explore.jsx` (`RouteList`, `PlanTab`), `src/styles/theme.css`

**Interfaces:**
- Consumes: `routeTitle`, `activityName` (Task 1), `useAppStore().moodLevel`
- Produces: `RouteList`에 새 prop `mood: number | null`(내 동선은 `null`, 추천 동선은 `moodLevel`). 머리에 `.route-head`(기분 칩 + 굵은 제목 + 요약 한 줄)를 렌더한다.

- [ ] **Step 1: `RouteList` 머리 추가.** 기존 이동 수단 칩 줄 위에 `routeTitle(stops, mood)`의 `chip`(있을 때만 `.chip`) + `title`(굵게)을 그리고, 요약("N곳 · 이동 …")은 기존 `plan-sum` 계산을 그대로 쓰되 이 머리 아래 한 줄로 옮긴다(아래쪽 `plan-sum`은 시간 안내 문구만 남김).
- [ ] **Step 2: 각 항목을 카드로.** 지금의 `plan-row`+`plan-leg`를 하나의 카드로 합친다: 번호 동그라미 + 활동 이름(`activityName(s)`, 굵게) → 장소 이름 버튼(기존 `onOpen`) → 칩 줄(머무는 시간 `STAY[s.type]`분 + 도착 예상 시각 `clock(etas[i])`(버스일 때는 시각 생략), 다음 장소로 가는 이동 방법·시간·거리 칩 — 마지막 카드는 이동 칩 없음) → 기존 "카카오맵에서 보기"·"설명 보기" 칩. 이동 칩 내용은 기존 `plan-leg`의 문구·"많이 멀어요/조금 멀어요" 경고·"이동시간 계산 중…"을 그대로 쓴다. `editable`일 때 위/아래/빼기 버튼은 카드 오른쪽에 유지.
- [ ] **Step 3: 호출부.** `PlanTab`에서 내 동선 `RouteList`에 `mood={null}`, 추천 동선에 `mood={moodLevel}`을 넘긴다.
- [ ] **Step 4: 스타일.** `.route-head`, `.route-card`(둥근 22px, `var(--surface)`, `var(--shadow-soft)`), `.route-chips`(칩 줄). 기존 `.plan-row`/`.plan-leg` 규칙은 쓰는 곳이 없으면 지운다.
- [ ] **Step 5: 확인(브라우저).** 추천 동선을 만들어 ① 기분 칩과 "숲과 바다 느끼기" 같은 제목이 보임 ② 카드마다 활동 이름·시간·이동 칩이 보이고 이동 수단(자동차/걷기/버스)을 바꾸면 칩이 바뀜 ③ 내 동선에는 기분 칩이 없고 제목은 "… 느끼기" ④ 순서 바꾸기·빼기가 동작 ⑤ 375px 너비에서 줄바꿈이 어색하지 않음. Expected: 모두 충족.
- [ ] **Step 6: Commit** — `git add src && git commit -m "feat: card-style route list with trait-based title"`

---

### Task 6: 버스 구간 세부정보

**Files:**
- Create: `src/components/BusLegDetail.jsx`
- Modify: `src/components/Explore.jsx` (`RouteList` 버스 이동 줄), `src/styles/theme.css`

**Interfaces:**
- Consumes: `fetchBusLeg` (Task 3), 항목의 `lat`/`lng`
- Produces: `BusLegDetail({ from: stop, to: stop })` — 열림 상태와 결과는 컴포넌트 안에 두고, 처음 열 때 한 번만 `fetchBusLeg` 호출. 두 곳 중 하나라도 좌표가 없으면 호출하지 않고 안내 문구.

- [ ] **Step 1: 컴포넌트 작성.** 카드의 버스 이동 칩("🚌 버스로 이동 N km") 옆에 `.chip`"세부정보 ›"(`aria-expanded`). 눌러서 펼치면 결과 목록: 줄마다 `101번` + "승차 {board.name}(걸어서 {board.meters}m) → 하차 {alight.name}(걸어서 {alight.meters}m)" + "{stops}개 정류장" + `nextMin`이 있으면 "다음 버스 약 {nextMin}분 뒤". 불러오는 동안 "버스를 찾는 중…". 결과가 비었거나 실패하면 "직접 가는 버스를 찾지 못했어요. 환승이 필요할 수 있어요." + 제주버스정보시스템 링크(`BUS_URL`과 같은 `https://bus.jeju.go.kr`). 다시 누르면 접힘.
- [ ] **Step 2: `RouteList`에 연결.** `bus`일 때만 각 이동 칩 옆에 `<BusLegDetail key={`${s.title}->${stops[i+1].title}`} from={s} to={stops[i + 1]} />`. `key`가 구간 이름 쌍이라 순서 바꾸기·빼기·이동 수단 변경 후 다시 돌아와도 상태가 엉뚱한 구간에 붙지 않는다.
- [ ] **Step 3: 스타일** `.bus-detail`(둥근 16px, `var(--soft)` 바탕), `.bus-opt`.
- [ ] **Step 4: 확인(브라우저).** 내 동선에 서로 떨어진 두 곳(예: 성산일출봉, 광치기해변)을 담고 이동 수단을 버스로 바꿔서 ① "세부정보 ›"가 이동 칩 옆에 보임 ② 누르면 번호와 승·하차 정류장이 보이거나 안내 문구가 보임 ③ 다시 누르면 접힘 ④ 순서를 바꾸면 다른 구간에 열린 상태가 남지 않음 ⑤ 자동차/걷기로 바꾸면 세부정보 탭이 사라짐 ⑥ 네트워크를 막은 것처럼 느린 응답에서도 화면이 멈추지 않음(서버 시간 제한 8초). Expected: 모두 충족.
- [ ] **Step 5: Commit** — `git add src && git commit -m "feat: bus leg detail tab in route cards"`

---

### Task 7: 챗 코스 카드 제목

**Files:**
- Modify: `src/components/ChatFab.jsx` (`CourseCard`), `src/styles/theme.css`

**Interfaces:**
- Consumes: `routeTitle` (Task 1), 앱 상태 `moodLevel`

- [ ] **Step 1:** `CourseCard` 맨 위에 `routeTitle(stops, moodLevel)`의 기분 칩과 제목을 그린다(기존 카드 내용·`+ 담기`·"이 코스를 내 동선에 담기"·`tip` 줄은 그대로). 서버 응답(`course`)은 바꾸지 않는다.
- [ ] **Step 2: 확인(브라우저).** 챗에서 "함께 여행 계획 세우기"로 코스 카드를 만들어 제목·칩이 보이고 380px 창에서 줄이 접히지 않는지, 담기 버튼이 동작하는지 확인. Expected: 충족.
- [ ] **Step 3: Commit** — `git add src && git commit -m "feat: trait-based title on chat course cards"`

---

### Task 8: 둥근 느낌 정리와 마무리

**Files:**
- Modify: `src/styles/theme.css`, `.gitignore`, `docs/NEXT.md`

- [ ] **Step 1: 모서리·카드 정리.** 장소 목록 카드, 칩, 날씨 띠 등에서 새 화면과 어긋나는 모서리만 `--r-card`(24px)/999px 계열로 맞춘다. 색·글자 크기·배치는 바꾸지 않는다.
- [ ] **Step 2: 모바일 전체 훑기(앱 브라우저, 375px).** 첫 화면 → 날씨·지도 → 장소 선택 → 동선(버스 세부정보 포함) → 챗 코스 카드 순서로 넘기며 가로 스크롤·잘린 글자·겹침이 없는지 본다. `npm run build`가 성공하고 `npm test`가 모두 통과해야 한다.
- [ ] **Step 3: 정리.** `.gitignore`에 `.superpowers/`를 추가하고, `docs/NEXT.md`에 이번 리디자인 완료·알려진 한계(버스 세부정보는 직행만, 비공식 API)를 적는다.
- [ ] **Step 4: Commit** — `git add .gitignore docs src && git commit -m "style: unify rounded cards, mobile pass, notes"`

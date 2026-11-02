# 이어서 할 일 (인수인계 메모)

## 지금까지 된 것 (최근)
- 여행 계획 챗 "함께 여행 계획 세우기": 누구와 → 이동 수단 → 걷는 정도 → 하고 싶은 것 → 코스 카드 (`src/components/ChatFab.jsx`, `server/plan.js`, `api/plan.js`)
- 코스 카드: 장소별 "+ 담기", "이 코스를 내 동선에 담기", 닫으면 사라진다는 안내
- 동선에 이동 수단 선택(자동차·걷기·버스) (`Explore.jsx` RouteList, store `transport`/`addStops`)
- 버스 노선 API 도구 `search_bus_routes` (`server/bus.js`, 제주데이터허브, 키 `JEJU_BUS_KEY`, 하루 1000회 → 24시간 캐시)
- 위험 문구: 여행 기록은 안내가 바로 뜨고 두 번 눌러야 저장, 문구·📞 다정하게 (`CrisisNotice.jsx`, `TripWrite.jsx`, `api/chat.js`)
- 몽숨이 답변에 이모지 한두 개 (`server/agent.js` 지시문)

## 확인 못 한 것
- 로그인이 필요한 화면(여행 기록 위험 문구 2단계 저장 등)은 브라우저로 직접 확인하지 못함
- 챗 위험 문구 카드(📞)와 자유 입력 중 위험 문구 처리 직접 확인 못 함
- 계획 흐름에서 직접 쓴 말은 보기와 맞을 때만 인식함 ("기타" 입력은 없음)
- 모바일 화면 확인 안 함 (챗 코스 카드, 세부 지도)

## 남은 일
1. README.md (크레딧: Fluent emoji MIT, OpenStreetMap, Open-Meteo, 기상청, Visit Jeju, 제주데이터허브 버스, AWS Terrain/SRTM, LINE Seed Sans KR OFL, Kakao, Leaflet) + 발표 자료
2. Vercel 배포 (환경변수 JEJU_BUS_KEY 포함, Supabase Site URL/redirect)
3. 슬라이더에 따라 몽숨이 동작 바꾸기 (지금은 항상 wave)
4. Gemini → Claude 교체 (`server/llm/claude.js`, ANTHROPIC_API_KEY)
5. 300자 제한 서버 쪽 검증, 버스 정류소 좌표 API 추가 검토
6. Ponytail 스킬 정리

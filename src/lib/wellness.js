// Visit Jeju "제주 웰니스관광지" 목록 (https://visitjeju.net/kr/jejuStory/wellness, 2026-11-03 확인, 11곳).
// 이 페이지는 "인증·선정·지정"이라는 말을 쓰지 않고 "제주 웰니스관광지"라고만 소개하므로, 화면에도 그 이름 그대로 쓴다.
// 목록이 작아서 코드에 두고, 관광지 데이터와는 이름(공백 무시)이 정확히 같을 때만 짝짓는다.
export const WELLNESS_PLACES = [
  { id: 'CONT_000000000500702', title: '환상숲곶자왈공원' },
  { id: 'CNTS_000000000018311', title: '서귀포 치유의 숲' },
  { id: 'CNTS_000000000001191', title: '생각하는정원' },
  { id: 'CNTS_200000000010337', title: 'WE호텔제주 웰니스 센터' },
  { id: 'CNTS_200000000008001', title: '머체왓숲길' },
  { id: 'CNTS_000000000000976', title: '신흥2리동백마을' },
  { id: 'CNTS_200000000010333', title: '파파빌레' },
  { id: 'CNTS_300000000013231', title: '회수다옥' },
  { id: 'CNTS_200000000010336', title: '취다선 리조트' },
  { id: 'CNTS_300000000016080', title: '제주 901' },
  { id: 'CNTS_300000000013338', title: '씬오브제주' },
]

const key = (t) => String(t ?? '').replace(/[\s()·\-]/g, '')
const KEYS = new Set(WELLNESS_PLACES.map((p) => key(p.title)))

export const isWellness = (title) => KEYS.has(key(title)) && key(title) !== ''

// 계절별 색 (Color Hunt 파스텔 팔레트 참고). 시스템 날짜로 자동 전환, 개발 중에는 ?season=spring 으로 미리 볼 수 있다.
export const SEASONS = {
  spring: {
    label: '봄',
    vars: { bg: '#FFF9D2', surface: '#FFFDF0', soft: '#FFEBCC', accent: '#BFDDF0', strong: '#8CC0EB', strongInk: '#1F3548', ink: '#3E3A24', sub: '#6B6648', line: '#E8E0B4' },
    scene: { sea: '#A9D2EC', land: '#CBE3AE', mount: '#B5C79A' },
  },
  summer: {
    label: '여름',
    vars: { bg: '#F1F6F5', surface: '#FFFFFF', soft: '#A5D1CD', accent: '#4DB39A', strong: '#4F5B64', strongInk: '#F1F6F5', ink: '#2F3A40', sub: '#56626A', line: '#D3DEDC' },
    scene: { sea: '#7EC4B6', land: '#B7CDB0', mount: '#8FA095' },
  },
  autumn: {
    label: '가을',
    vars: { bg: '#FFF0BE', surface: '#FFF8DF', soft: '#FFD6A6', accent: '#FFB399', strong: '#FF9A86', strongInk: '#4A1D12', ink: '#4A3022', sub: '#7A5A44', line: '#EBD6A4' },
    scene: { sea: '#A8CDE0', land: '#E8CFA0', mount: '#C99A7A' },
  },
  winter: {
    label: '겨울',
    vars: { bg: '#FDF6ED', surface: '#FFFCF8', soft: '#DCCFC0', accent: '#A1BC98', strong: '#DCCFC0', strongInk: '#3A332B', ink: '#403A34', sub: '#6A6258', line: '#E6DACB' },
    scene: { sea: '#B9CDD6', land: '#EFEAE2', mount: '#CFC6BA' },
  },
}

export function seasonOf(date = new Date()) {
  const m = date.getMonth() + 1
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}

export function currentSeason() {
  const q = new URLSearchParams(window.location.search).get('season')
  return SEASONS[q] ? q : seasonOf()
}

export const season = currentSeason()

export function applySeason(name = season) {
  const root = document.documentElement
  root.dataset.season = name
  for (const [k, v] of Object.entries(SEASONS[name].vars)) {
    root.style.setProperty(`--${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, v)
  }
}

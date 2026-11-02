// 제주 날씨.
//  · 현재 기온·습도·강수·바람·하늘: 기상청 초단기실황·초단기예보 (공공데이터포털, 제주시 격자 52,38) — 실측이라 가장 정확하다
//  · 일출·일몰·자외선·미세먼지: Open-Meteo (키 없음, 제주시 좌표). 미세먼지는 모델 값이다
//  · 기상청이 실패하면 Open-Meteo 로 대신한다
import { dataGoKey } from './tour.js'

// 제주시 시내 (한라산 중턱이 아니라 사람이 사는 곳의 날씨를 보여 준다)
const LAT = 33.5
const LNG = 126.53
const NX = 52
const NY = 38

const KMA = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0'
const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
const kstNow = () => new Date(Date.now() + 9 * 3600 * 1000) // getUTC* 로 읽으면 한국 시각

const json = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!r.ok) throw new Error(`weather ${r.status}`)
  return r.json()
}

async function kma(op, baseDate, baseTime, rows) {
  const url = new URL(`${KMA}/${op}`)
  url.search = new URLSearchParams({ serviceKey: dataGoKey(), pageNo: 1, numOfRows: rows, dataType: 'JSON', base_date: baseDate, base_time: baseTime, nx: NX, ny: NY })
  const j = await json(url)
  if (j.response?.header?.resultCode !== '00') throw new Error(`kma ${j.response?.header?.resultMsg}`)
  return j.response.body.items.item
}

// 하늘: clear | partly | cloudy | overcast | fog | rain | snow | sleet
function skyFromKma(pty, sky) {
  if (pty === 3 || pty === 7) return 'snow'
  if (pty === 2 || pty === 6) return 'sleet'
  if (pty === 1 || pty === 5) return 'rain'
  return sky === 1 ? 'clear' : sky === 3 ? 'cloudy' : 'overcast'
}

// Open-Meteo(WMO 코드) → 같은 말
function skyFromWmo(code) {
  if (code <= 1) return 'clear'
  if (code === 2) return 'partly'
  if (code === 3) return 'overcast'
  if (code === 45 || code === 48) return 'fog'
  if (code === 56 || code === 57 || code === 66 || code === 67) return 'sleet'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  return 'rain'
}

// 체감온도 (Steadman 계열 겉보기 온도): 기온, 습도(%), 풍속(m/s)
function apparent(t, rh, ws) {
  const e = (rh / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t))
  return Math.round((t + 0.33 * e - 0.7 * ws - 4) * 10) / 10
}

async function fromKma() {
  const now = kstNow()
  // 실황: 매시 정각 자료, 40분 뒤 제공 → 45분 전 시각의 정각
  const a = new Date(now.getTime() - 45 * 60000)
  const ncst = await kma('getUltraSrtNcst', ymd(a), `${pad(a.getUTCHours())}00`, 20)
  const v = Object.fromEntries(ncst.map((i) => [i.category, Number(i.obsrValue)]))
  // 예보: 매시 30분 발표, 45분 뒤 제공 → 50분 전 기준 가장 가까운 30분
  const b = new Date(now.getTime() - 50 * 60000)
  const bh = b.getUTCMinutes() >= 30 ? b.getUTCHours() : b.getUTCHours() - 1
  const bd = b.getUTCMinutes() >= 30 || bh >= 0 ? b : new Date(b.getTime() - 86400000)
  const fc = await kma('getUltraSrtFcst', ymd(bd), `${pad((bh + 24) % 24)}30`, 60)
  const firstTime = fc.filter((i) => i.category === 'SKY').sort((x, y) => (x.fcstDate + x.fcstTime).localeCompare(y.fcstDate + y.fcstTime))[0]
  const skyNow = Number(firstTime?.fcstValue ?? 4)
  const sky = skyFromKma(v.PTY, skyNow)
  return {
    source: '기상청',
    obsTime: `${pad(a.getUTCHours())}:00`,
    temp: v.T1H,
    feels: apparent(v.T1H, v.REH, v.WSD),
    humidity: v.REH,
    wind: Math.round(v.WSD * 3.6), // km/h
    rain: v.RN1, // 1시간 강수량(mm)
    sky,
  }
}

async function fromOpenMeteoCurrent() {
  const w = await json(
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&timezone=Asia%2FSeoul`,
  )
  return {
    source: 'Open-Meteo',
    obsTime: w.current.time.slice(11),
    temp: w.current.temperature_2m,
    feels: w.current.apparent_temperature,
    humidity: w.current.relative_humidity_2m,
    wind: Math.round(w.current.wind_speed_10m),
    rain: w.current.precipitation,
    sky: skyFromWmo(w.current.weather_code),
  }
}

export async function getWeather() {
  const [cur, daily, air] = await Promise.all([
    fromKma().catch(() => fromOpenMeteoCurrent()),
    json(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&daily=sunrise,sunset,uv_index_max&timezone=Asia%2FSeoul&forecast_days=1`),
    json(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LNG}&current=pm10,pm2_5&timezone=Asia%2FSeoul`).catch(() => null),
  ])
  const now = kstNow()
  const hhmm = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}`
  const sunrise = daily.daily.sunrise[0].slice(11)
  const sunset = daily.daily.sunset[0].slice(11)
  return {
    ...cur,
    time: hhmm,
    isDay: hhmm >= sunrise && hhmm < sunset,
    sunrise,
    sunset,
    uvMax: daily.daily.uv_index_max[0],
    pm10: air?.current?.pm10 ?? null,
    pm25: air?.current?.pm2_5 ?? null,
  }
}

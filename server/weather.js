// 제주 날씨·대기질·일출일몰 (Open-Meteo, 키 없음)
const LAT = 33.4
const LNG = 126.55

const json = async (url) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`open-meteo ${r.status}`)
  return r.json()
}

export async function getWeather() {
  const [w, a] = await Promise.all([
    json(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}` +
        '&current=temperature_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,is_day' +
        '&daily=sunrise,sunset,uv_index_max&timezone=Asia%2FSeoul&forecast_days=1',
    ),
    json(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LNG}` +
        '&current=pm10,pm2_5&timezone=Asia%2FSeoul',
    ),
  ])
  return {
    temp: w.current.temperature_2m,
    feels: w.current.apparent_temperature,
    code: w.current.weather_code,
    cloud: w.current.cloud_cover,
    wind: w.current.wind_speed_10m,
    isDay: w.current.is_day === 1,
    sunrise: w.daily.sunrise[0],
    sunset: w.daily.sunset[0],
    uvMax: w.daily.uv_index_max[0],
    pm10: a.current?.pm10 ?? null,
    pm25: a.current?.pm2_5 ?? null,
    time: w.current.time,
  }
}

// 날씨(sky) → 3D 지도 장면 설정. 서버가 주는 sky: clear | partly | cloudy | overcast | fog | rain | snow | sleet
// grey: 하늘·바다를 회색빛으로 흐리는 정도(0~1), light: 햇빛 세기 배율, fogNear/fogFar: 안개 거리,
// precip: 내리는 것, clouds: 구름 덩이 수, snowCover: 섬이 눈으로 덮이는 정도(0~1)
const BASE = { grey: 0, light: 1, fogNear: 16, fogFar: 34, precip: null, clouds: 0, snowCover: 0 }

const BY_SKY = {
  clear: {},
  partly: { grey: 0.1, light: 0.85, clouds: 3 },
  cloudy: { grey: 0.25, light: 0.65, clouds: 6 },
  overcast: { grey: 0.5, light: 0.45, clouds: 9, fogNear: 12, fogFar: 28 },
  fog: { grey: 0.45, light: 0.5, fogNear: 8, fogFar: 24 }, // 폰에서 카메라가 섬에서 약 15 떨어져 있어, 이보다 짧으면 섬이 통째로 사라진다
  rain: { grey: 0.55, light: 0.4, clouds: 8, fogNear: 10, fogFar: 26, precip: 'rain' },
  snow: { grey: 0.45, light: 0.65, clouds: 6, fogNear: 10, fogFar: 26, precip: 'snow', snowCover: 0.6 },
  sleet: { grey: 0.55, light: 0.4, clouds: 8, fogNear: 10, fogFar: 26, precip: 'sleet', snowCover: 0 },
}

export const mapWeather = (sky) => ({ ...BASE, ...(BY_SKY[sky] || BY_SKY.clear) })

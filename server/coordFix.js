// 관광지 원본 좌표 점검: 주소로 찾은 위치와 크게 어긋나는 곳만 고치거나 숨긴다.
//  keep: 그대로 둔다 / fix: 카카오 이름 검색 위치로 바꾼다 / hide: 어느 쪽이 맞는지 알 수 없어 숨긴다
const LAT_MAX = 33.62 // 3D 지형이 끝나는 위도. 추자도처럼 이보다 위는 지도 밖에 찍힌다
const km = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 92)
const norm = (t) => String(t || '').replace(/\([^)]*\)/g, '').replace(/\s+/g, '')

// 번지·도로 번호가 있는 주소만 좁게(3km) 본다. 읍·면·리까지만 있으면 그 지역의 중심점이라 넓게(10km) 본다.
const limitOf = (address) => (/\d/.test(address || '') ? 3 : 10)

// spot: {title, address, lat, lng}, addr: 주소로 찾은 {lat,lng} | null, named: 카카오 이름 검색 첫 결과 {title,lat,lng} | null
export function judge(spot, addr, named) {
  const exact = named && norm(named.title) === norm(spot.title) ? named : null
  if (addr && km(spot, addr) > limitOf(spot.address)) {
    if (exact && km(exact, addr) <= limitOf(spot.address) - 1) return { action: 'fix', lat: exact.lat, lng: exact.lng }
    if (exact && km(exact, spot) <= 1.5) return { action: 'keep' } // 좌표는 이름으로도 확인됨, 주소가 틀린 곳
    return { action: 'hide' }
  }
  if (spot.lat > LAT_MAX) return { action: 'hide' }
  return { action: 'keep' }
}

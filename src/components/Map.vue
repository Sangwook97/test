<template>
  <div class="map-container">
    <div class="map-header">
      <h2>🗺️ 서울 축제 및 시설 지도 시각화</h2>
      <p>마우스를 스크롤하여 지도를 확대/축소하고, 마커를 클릭해 상세 정보를 확인하세요.</p>
    </div>
    
    <div id="kakao-map" class="map-area"></div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

// 여러 데이터 파일을 안전한 상대 경로로 불러옵니다. (기존 경로 유지)
import festivals from '../../data/서울_축제공연행사.json'
import sights from '../../data/서울_관광지.json'
import culture from '../../data/서울_문화시설.json'
import leisure from '../../data/서울_레포츠.json'
import shopping from '../../data/서울_쇼핑.json'
import lodging from '../../data/서울_숙박.json'

// 💡 1. 주석 처리되어 있던 API 키 환경변수 바인딩을 활성화합니다.
const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_API_KEY || ''

onMounted(() => {
  // 이미 카카오맵 API 라이브러리가 로드되었는지 확인 후 분기
  if (window.kakao && window.kakao.maps) {
    initMap()
  } else {
    if (!KAKAO_API_KEY) {
      console.error('⚠️ VITE_KAKAO_API_KEY가 설정되어 있지 않습니다. 프로젝트 루트 폴더의 .env 파일에 키를 추가해 주세요.')
      return
    }
    
    // 동적으로 카카오 지도 SDK 로딩용 script 태그 생성
    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&autoload=false`
    
    script.addEventListener('load', () => {
      // 스크립트 로드 성공 시 카카오 맵 수동 로드 시작
      window.kakao.maps.load(initMap)
    })
    document.head.appendChild(script)
  }
})

// 💡 2. 지도 초기화 및 마커 렌더링 함수
const initMap = () => {
  const container = document.getElementById('kakao-map')
  if (!container) return

  const options = {
    center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울 시청 중심 좌표
    level: 7 // 줌 레벨
  }
  
  const map = new window.kakao.maps.Map(container, options)
  
  // 우측 상단 줌 컨트롤 추가
  const zoomControl = new window.kakao.maps.ZoomControl()
  map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT)
  
  // 각 분야별로 분류할 마커 카테고리 구성
  const datasets = [
    { list: festivals.items || [], label: '축제', color: '#e53e3e' },
    { list: sights.items || [], label: '관광지', color: '#2b6cb0' },
    { list: culture.items || [], label: '문화시설', color: '#d69e2e' },
    { list: leisure.items || [], label: '레포츠', color: '#2f855a' },
    { list: shopping.items || [], label: '쇼핑', color: '#9f7aea' },
    { list: lodging.items || [], label: '숙박', color: '#dd6b20' }
  ]

  // 마커로 사용될 커스텀 SVG 생성기 (안전한 SVG 인코딩 처리 적용)
  const createMarkerImage = (color) => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='38' viewBox='0 0 24 34'><path fill='${color}' d='M12 0C7 0 3 4 3 9c0 7.5 9 25 9 25s9-17.5 9-25c0-5-4-9-9-9z'/></svg>`
    const url = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
    return new window.kakao.maps.MarkerImage(
      url, 
      new window.kakao.maps.Size(28, 38), 
      { anchor: new window.kakao.maps.Point(14, 34) }
    )
  }

  // 여러 데이터셋에서 위/경도 기반으로 지도에 마커 등록
  datasets.forEach(ds => {
    const markerImage = createMarkerImage(ds.color)
    
    ds.list.forEach(item => {
      const lat = parseFloat(item.mapy)
      const lng = parseFloat(item.mapx)
      if (isNaN(lat) || isNaN(lng)) return // 좌표 데이터 검증

      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(lat, lng),
        map: map,
        title: item.title,
        image: markerImage
      })

      // 마커 클릭 시 보일 커스텀 정보창 HTML 
      const infoContent = `
        <div class="custom-infowindow">
          <h4 class="info-title">🎉 ${item.title}</h4>
          <p class="info-addr">📍 ${item.addr1 || '주소 정보 없음'}</p>
          <span class="info-tag" style="background-color: ${ds.color}15; color: ${ds.color};">${ds.label}</span>
          <hr class="info-line" />
          <a class="info-link" href="https://search.naver.com/search.naver?query=${encodeURIComponent(item.title)}" target="_blank">
            상세 정보 검색 ↗
          </a>
        </div>
      `

      // 카카오 기본 흰색 말풍선 말단부 여백을 상쇄하기 위해 깔끔한 InfoWindow 옵션 사용
      const infowindow = new window.kakao.maps.InfoWindow({ 
        content: infoContent, 
        removable: true 
      })

      // 클릭 시 기존 인포윈도우는 열고 지도 중심을 마커로 맞춰주는 인터랙션 추가
      window.kakao.maps.event.addListener(marker, 'click', () => {
        infowindow.open(map, marker)
        map.panTo(new window.kakao.maps.LatLng(lat, lng))
      })
    })
  })
}
</script>

<style>
/* ⚠️ 카카오 맵 내부의 동적 HTML에 스타일을 바인딩하기 위해 scoped를 적용하지 않습니다. */
.map-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.map-header {
  margin-bottom: 12px;
}

.map-header h2 {
  margin: 0 0 5px 0;
  font-size: 1.25rem;
  color: #1e293b;
  font-weight: 700;
}

.map-header p {
  margin: 0;
  color: #64748b;
  font-size: 0.85rem;
}

/* 지도 영역 스타일링 */
.map-area {
  width: 100%;
  height: 420px; /* 기존 min-height보다 한 화면에서 보이기 적당하게 420px로 조절 */
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

/* 💡 동적 삽입용 custom-infowindow 스타일 고도화 */
.custom-infowindow {
  padding: 14px;
  width: 210px;
  box-sizing: border-box;
}

.info-title {
  margin: 0 0 6px 0 !important;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  white-space: normal;
  word-break: keep-all;
  line-height: 1.3;
}

.info-addr {
  margin: 0 0 8px 0 !important;
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.4;
}

.info-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.info-line {
  border: 0;
  height: 1px;
  background-color: #f1f5f9;
  margin: 8px 0 !important;
}

.info-link {
  display: inline-block;
  font-size: 12px;
  color: #6366f1;
  text-decoration: none;
  font-weight: 700;
}

.info-link:hover {
  text-decoration: underline;
}
</style>
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'localhub-language'

const savedLocale =
  typeof window !== 'undefined'
    ? window.localStorage.getItem(STORAGE_KEY)
    : null

const locale = ref(savedLocale === 'en' ? 'en' : 'ko')

const messages = {
  ko: {
    'language.korean': '한국어',
    'language.english': 'English',
    'language.switchToKorean': '한국어로 전환',
    'language.switchToEnglish': '영어로 전환',

    'header.searchPlaceholder': '서울 정보 검색',
    'header.search': '검색',
    'header.filter': '필터',
    'header.selectDistrict': '구 선택',
    'header.reset': '초기화',

    'category.tourist': '관광지',
    'category.leisure': '레포츠',
    'category.culture': '문화시설',
    'category.shopping': '쇼핑',
    'category.lodging': '숙박',
    'category.course': '여행코스',
    'category.festival': '축제공연행사',
    'category.community': '커뮤니티',

    'home.regionAria': '서울 지역정보',
    'home.festivalAria': '서울 축제 정보',
    'home.festivalTitle': '서울 축제 정보',
    'home.festivalDescription': '날짜별 축제 일정과 현재 진행 중인 축제를 확인할 수 있습니다.',

    'cards.regionTitle': '서울 지역정보 {count}개 · 총 좋아요 {likes}개',
    'cards.empty': '선택된 카테고리의 데이터가 없습니다.',
    'cards.imageAlt': '정보 카드 이미지',
    'cards.noAddress': '주소 정보 없음',
    'cards.likes': '좋아요',

    'calendar.title': '축제 일정 달력',
    'calendar.description': '축제 막대를 누르거나 날짜를 선택해 일정을 확인하세요.',
    'calendar.today': '오늘',
    'calendar.previousMonth': '이전 달',
    'calendar.nextMonth': '다음 달',
    'calendar.noFestivalTitle': '축제명 없음',
    'calendar.more': '+{count}개',
    'calendar.notice': '달력 막대에는 6개월 미만 행사만 표시됩니다. 장기 행사는 아래 날짜별 목록과 진행 중인 축제에서 확인할 수 있습니다.',
    'calendar.selectedTitle': '특정 날짜 축제',
    'calendar.count': '{count}개',
    'calendar.empty': '선택한 날짜에는 진행 중인 축제가 없습니다.',
    'calendar.noDate': '날짜 정보 없음',
    'calendar.noPlace': '장소 정보 없음',

    'ongoing.title': '진행 중인 축제',
    'ongoing.description': '오늘을 기준으로 현재 진행 중인 축제입니다.',
    'ongoing.count': '{count}개',
    'ongoing.empty': '현재 진행 중인 축제가 없습니다.',
    'ongoing.noFestivalTitle': '축제명 없음',
    'ongoing.noDate': '날짜 정보 없음',
    'ongoing.noPlace': '장소 정보 없음',
    'ongoing.ended': '종료',
    'ongoing.endsToday': '오늘 종료',
    'ongoing.showAll': '축제 전체보기 ({count}개)',
    'ongoing.collapse': '접기',


    'board.title': '익명 커뮤니티 게시판',
    'board.write': '글쓰기',
    'board.newPost': '새 글 작성 (익명)',
    'board.authorPlaceholder': '작성자 닉네임',
    'board.passwordPlaceholder': '수정/삭제 비밀번호',
    'board.all': '전체',
    'board.titlePlaceholder': '글 제목',
    'board.contentPlaceholder': '내용을 입력하세요...',
    'board.cancel': '취소',
    'board.publish': '게시하기',
    'board.editPost': '글 수정하기',
    'board.editingInfo': '수정 중인 글: [{region}] {author} 님의 글',
    'board.updateComplete': '수정 완료',
    'board.latest': '최신순',
    'board.mostLiked': '좋아요순',
    'board.perPage': '{count}개씩 보기',
    'board.noPosts': '조건에 맞는 게시글이 없습니다.',
    'board.allRegions': '전체 지역',
    'board.searchPlaceholder': '🔍 제목 또는 작성자로 검색...',
    'board.back': '목록으로 돌아가기',
    'board.edit': '수정',
    'board.delete': '삭제',
    'board.author': '작성자',
    'board.views': '조회수',
    'board.like': '좋아요',
    'board.dislike': '싫어요',
    'board.comments': '댓글',
    'board.namePlaceholder': '이름',
    'board.commentPlaceholder': '댓글을 입력하세요...',
    'board.submit': '등록',
    'board.firstComment': '첫 댓글을 남겨보세요!',
    'board.authTitle': '권한 인증',
    'board.authEditDescription': '게시글 수정을 위해 비밀번호를 입력해주세요.',
    'board.authDeleteDescription': '게시글 삭제를 위해 비밀번호를 입력해주세요. (관리자는 마스터 비밀번호)',
    'board.passwordInput': '비밀번호 입력',
    'board.confirm': '확인',
    'board.formRequired': '작성자 닉네임, 비밀번호, 제목, 내용을 모두 입력해주세요!',
    'board.passwordRequired': '비밀번호를 입력해주세요!',
    'board.passwordMismatch': '비밀번호가 일치하지 않습니다.',
    'board.masterDeleted': '👑 마스터 권한으로 게시글을 삭제하였습니다.',
    'board.deleted': '정상적으로 삭제되었습니다.',
    'board.editRequired': '제목과 내용을 모두 입력해주세요!',
    'board.commentAuthorRequired': '댓글 작성자 닉네임을 입력해 주세요!',
    'board.commentRequired': '댓글 내용을 입력해 주세요!',

    'chatbot.dialogLabel': 'LocalHub 도우미 채팅창',
    'chatbot.title': 'LocalHub 도우미',
    'chatbot.status': '무엇을 도와드릴까요?',
    'chatbot.close': '챗봇 닫기',
    'chatbot.loadingLabel': '답변 작성 중',
    'chatbot.examplesTitle': '질문 예시',
    'chatbot.source': '데이터 출처: 한국관광공사 TourAPI 4.0',
    'chatbot.inputLabel': '메시지 입력',
    'chatbot.placeholder': '예: 노원구 관광지',
    'chatbot.searching': '검색 중',
    'chatbot.send': '전송',
    'chatbot.open': 'LocalHub 챗봇 열기',
    'chatbot.toggleClose': 'LocalHub 챗봇 닫기',
    'chatbot.welcome': '안녕하세요! LocalHub 도우미입니다.\n\n서울의 관광지, 문화시설, 축제, 레포츠, 쇼핑, 숙박, 여행코스 정보를 안내해 드립니다.\n\n지역구와 원하는 유형을 함께 입력해 주세요.\n예: 노원구 관광지, 마포구 쇼핑, 강남구 숙박',
    'chatbot.noAnswer': '답변을 불러오지 못했습니다.',
    'chatbot.noResult': '제공된 서울 지역정보 데이터에서 관련 장소를 찾지 못했습니다.',
    'chatbot.requestFailed': '추천 정보를 가져오지 못했습니다.',
    'chatbot.unknownError': '추천 정보를 가져오는 중 알 수 없는 오류가 발생했습니다.',
    'chatbot.apiKeyMissing': 'OpenAI API 키를 확인해 주세요.\n프로젝트 루트의 .env 파일에 VITE_OPENAI_API_KEY가 있어야 합니다.',
    'chatbot.apiKeyInvalid': 'OpenAI API 키가 올바르지 않습니다.',
    'chatbot.quotaExceeded': 'OpenAI API 사용량이 초과되었습니다.\n잠시 후 다시 시도해 주세요.',
    'chatbot.dataLoadFailed': '지역정보 JSON 파일을 불러오지 못했습니다.\npublic/data 폴더와 파일명을 확인해 주세요.',
    'chatbot.networkError': '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
    'chatbot.responseErrorLog': '챗봇 응답 오류',
  },

  en: {
    'language.korean': '한국어',
    'language.english': 'English',
    'language.switchToKorean': 'Switch to Korean',
    'language.switchToEnglish': 'Switch to English',

    'header.searchPlaceholder': 'Search Seoul information',
    'header.search': 'Search',
    'header.filter': 'Filter',
    'header.selectDistrict': 'Select a district',
    'header.reset': 'Reset',

    'category.tourist': 'Attractions',
    'category.leisure': 'Leisure',
    'category.culture': 'Cultural Facilities',
    'category.shopping': 'Shopping',
    'category.lodging': 'Accommodation',
    'category.course': 'Travel Courses',
    'category.festival': 'Festivals & Events',
    'category.community': 'Community',

    'home.regionAria': 'Seoul local information',
    'home.festivalAria': 'Seoul festival information',
    'home.festivalTitle': 'Seoul Festival Information',
    'home.festivalDescription': 'Check festival schedules by date and festivals currently in progress.',

    'cards.regionTitle': '{count} Seoul listings · {likes} total likes',
    'cards.empty': 'There is no data for the selected category.',
    'cards.imageAlt': 'Information card image',
    'cards.noAddress': 'Address unavailable',
    'cards.likes': 'Likes',

    'calendar.title': 'Festival Calendar',
    'calendar.description': 'Select a date or a festival bar to view the schedule.',
    'calendar.today': 'Today',
    'calendar.previousMonth': 'Previous month',
    'calendar.nextMonth': 'Next month',
    'calendar.noFestivalTitle': 'Untitled festival',
    'calendar.more': '+{count}',
    'calendar.notice': 'Only events shorter than six months are displayed as calendar bars. Long-running events remain available in the selected-date and ongoing-festival lists below.',
    'calendar.selectedTitle': 'Festivals on the Selected Date',
    'calendar.count': '{count}',
    'calendar.empty': 'There are no festivals in progress on the selected date.',
    'calendar.noDate': 'Date unavailable',
    'calendar.noPlace': 'Location unavailable',

    'ongoing.title': 'Ongoing Festivals',
    'ongoing.description': 'Festivals currently in progress based on today’s date.',
    'ongoing.count': '{count}',
    'ongoing.empty': 'There are no festivals currently in progress.',
    'ongoing.noFestivalTitle': 'Untitled festival',
    'ongoing.noDate': 'Date unavailable',
    'ongoing.noPlace': 'Location unavailable',
    'ongoing.ended': 'Ended',
    'ongoing.endsToday': 'Ends today',
    'ongoing.showAll': 'Show all festivals ({count})',
    'ongoing.collapse': 'Collapse',


    'board.title': 'Anonymous Community Board',
    'board.write': 'Write a Post',
    'board.newPost': 'New Anonymous Post',
    'board.authorPlaceholder': 'Author nickname',
    'board.passwordPlaceholder': 'Password for editing/deleting',
    'board.all': 'All',
    'board.titlePlaceholder': 'Post title',
    'board.contentPlaceholder': 'Enter your post...',
    'board.cancel': 'Cancel',
    'board.publish': 'Publish',
    'board.editPost': 'Edit Post',
    'board.editingInfo': 'Editing: [{region}] post by {author}',
    'board.updateComplete': 'Save Changes',
    'board.latest': 'Latest',
    'board.mostLiked': 'Most Liked',
    'board.perPage': 'Show {count}',
    'board.noPosts': 'No posts match the selected conditions.',
    'board.allRegions': 'All regions',
    'board.searchPlaceholder': '🔍 Search by title or author...',
    'board.back': 'Back to list',
    'board.edit': 'Edit',
    'board.delete': 'Delete',
    'board.author': 'Author',
    'board.views': 'Views',
    'board.like': 'Like',
    'board.dislike': 'Dislike',
    'board.comments': 'Comments',
    'board.namePlaceholder': 'Name',
    'board.commentPlaceholder': 'Enter a comment...',
    'board.submit': 'Submit',
    'board.firstComment': 'Be the first to leave a comment!',
    'board.authTitle': 'Authorization',
    'board.authEditDescription': 'Enter the password to edit this post.',
    'board.authDeleteDescription': 'Enter the password to delete this post. Administrators may use the master password.',
    'board.passwordInput': 'Enter password',
    'board.confirm': 'Confirm',
    'board.formRequired': 'Enter an author nickname, password, title, and content.',
    'board.passwordRequired': 'Enter the password.',
    'board.passwordMismatch': 'The password does not match.',
    'board.masterDeleted': 'The post was deleted with administrator privileges.',
    'board.deleted': 'The post was deleted.',
    'board.editRequired': 'Enter both a title and content.',
    'board.commentAuthorRequired': 'Enter a nickname for the comment.',
    'board.commentRequired': 'Enter a comment.',

    'chatbot.dialogLabel': 'LocalHub assistant chat window',
    'chatbot.title': 'LocalHub Assistant',
    'chatbot.status': 'How can I help?',
    'chatbot.close': 'Close chatbot',
    'chatbot.loadingLabel': 'Writing a response',
    'chatbot.examplesTitle': 'Example questions',
    'chatbot.source': 'Data source: Korea Tourism Organization TourAPI 4.0',
    'chatbot.inputLabel': 'Enter a message',
    'chatbot.placeholder': 'Example: Tourist attractions in Nowon-gu',
    'chatbot.searching': 'Searching',
    'chatbot.send': 'Send',
    'chatbot.open': 'Open the LocalHub chatbot',
    'chatbot.toggleClose': 'Close the LocalHub chatbot',
    'chatbot.welcome': 'Hello! I’m the LocalHub Assistant.\n\nI can help you find attractions, cultural facilities, festivals, leisure activities, shopping, accommodation, and travel courses in Seoul.\n\nEnter a district and the type of place you need.\nExample: Attractions in Nowon-gu, shopping in Mapo-gu, accommodation in Gangnam-gu',
    'chatbot.noAnswer': 'The response could not be loaded.',
    'chatbot.noResult': 'No matching place was found in the provided Seoul local-information data.',
    'chatbot.requestFailed': 'The recommendation could not be loaded.',
    'chatbot.unknownError': 'An unknown error occurred while loading recommendations.',
    'chatbot.apiKeyMissing': 'Check the OpenAI API key.\nVITE_OPENAI_API_KEY must be set in the project root .env file.',
    'chatbot.apiKeyInvalid': 'The OpenAI API key is invalid.',
    'chatbot.quotaExceeded': 'The OpenAI API quota has been exceeded.\nPlease try again later.',
    'chatbot.dataLoadFailed': 'The local-information JSON files could not be loaded.\nCheck the public/data folder and file names.',
    'chatbot.networkError': 'Check your network connection and try again.',
    'chatbot.responseErrorLog': 'Chatbot response error',
  },
}

export const CATEGORY_OPTIONS = [
  { value: '관광지', key: 'category.tourist' },
  { value: '레포츠', key: 'category.leisure' },
  { value: '문화시설', key: 'category.culture' },
  { value: '쇼핑', key: 'category.shopping' },
  { value: '숙박', key: 'category.lodging' },
  { value: '여행코스', key: 'category.course' },
  { value: '축제공연행사', key: 'category.festival' },
  { value: '커뮤니티', key: 'category.community' },
]

export const DISTRICT_OPTIONS = [
  { value: '종로구', ko: '종로구', en: 'Jongno-gu' },
  { value: '중구', ko: '중구', en: 'Jung-gu' },
  { value: '용산구', ko: '용산구', en: 'Yongsan-gu' },
  { value: '성동구', ko: '성동구', en: 'Seongdong-gu' },
  { value: '광진구', ko: '광진구', en: 'Gwangjin-gu' },
  { value: '동대문구', ko: '동대문구', en: 'Dongdaemun-gu' },
  { value: '중랑구', ko: '중랑구', en: 'Jungnang-gu' },
  { value: '성북구', ko: '성북구', en: 'Seongbuk-gu' },
  { value: '강북구', ko: '강북구', en: 'Gangbuk-gu' },
  { value: '도봉구', ko: '도봉구', en: 'Dobong-gu' },
  { value: '노원구', ko: '노원구', en: 'Nowon-gu' },
  { value: '은평구', ko: '은평구', en: 'Eunpyeong-gu' },
  { value: '서대문구', ko: '서대문구', en: 'Seodaemun-gu' },
  { value: '마포구', ko: '마포구', en: 'Mapo-gu' },
  { value: '양천구', ko: '양천구', en: 'Yangcheon-gu' },
  { value: '강서구', ko: '강서구', en: 'Gangseo-gu' },
  { value: '구로구', ko: '구로구', en: 'Guro-gu' },
  { value: '금천구', ko: '금천구', en: 'Geumcheon-gu' },
  { value: '영등포구', ko: '영등포구', en: 'Yeongdeungpo-gu' },
  { value: '동작구', ko: '동작구', en: 'Dongjak-gu' },
  { value: '관악구', ko: '관악구', en: 'Gwanak-gu' },
  { value: '서초구', ko: '서초구', en: 'Seocho-gu' },
  { value: '강남구', ko: '강남구', en: 'Gangnam-gu' },
  { value: '송파구', ko: '송파구', en: 'Songpa-gu' },
  { value: '강동구', ko: '강동구', en: 'Gangdong-gu' },
]

function interpolate(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] ?? `{${key}}`
  })
}

function t(key, params = {}) {
  const currentMessages = messages[locale.value] || messages.ko
  const fallbackMessages = messages.ko
  const template = currentMessages[key] ?? fallbackMessages[key] ?? key

  return interpolate(template, params)
}

function setLocale(nextLocale) {
  locale.value = nextLocale === 'en' ? 'en' : 'ko'
}

function toggleLocale() {
  setLocale(locale.value === 'ko' ? 'en' : 'ko')
}

const localeCode = computed(() => (locale.value === 'en' ? 'en-US' : 'ko-KR'))
const isEnglish = computed(() => locale.value === 'en')

watch(
  locale,
  (nextLocale) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextLocale)
    }

    if (typeof document !== 'undefined') {
      document.documentElement.lang = nextLocale
    }
  },
  { immediate: true },
)

export function useI18n() {
  return {
    locale,
    localeCode,
    isEnglish,
    t,
    setLocale,
    toggleLocale,
  }
}

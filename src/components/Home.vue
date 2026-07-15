<template>
  <div class="home">
    <Header
      v-model:search="searchKeyword"
      v-model:district="selectedDistrict"
      @search="performSearch"
      @navigate="onNavigate"
      @clear-category="clearActiveCategory"
    />

    <CategoryTabs
      :active="activeCategory"
      @update:active="onCategorySelect"
    />

    <LandingView
      v-if="currentPage === 'landing'"
      @enter="enterMain"
    />

    <main
      v-else
      class="home__content"
    >
      <!-- 커뮤니티 -->
      <Board
        v-if="
          activeCategory === '커뮤니티'
        "
      />

      <!-- 지역정보 및 축제 -->
      <div
        v-else
        class="home__content-inner"
      >
        <section
          class="home__region-section"
          :aria-label="
            t('home.regionAria')
          "
        >
          <InfoCardList
            :items="filteredList"
            :total="filteredList.length"
            :total-likes="totalLikes"
            @toggle-like="handleToggle"
          />
        </section>

        <!-- 지역정보 아래 축제 영역 -->
        <section
          class="home__festival-section"
          :aria-label="
            t('home.festivalAria')
          "
        >
          <div
            class="home__section-heading"
          >
            <div>
              <h2
                class="home__section-title"
              >
                {{
                  t(
                    'home.festivalTitle',
                  )
                }}
              </h2>

              <p
                class="home__section-description"
              >
                {{
                  t(
                    'home.festivalDescription',
                  )
                }}
              </p>
            </div>
          </div>

          <FestivalCalendar
            :festivals="festivalItems"
          />

          <OngoingFestivalPanel
            :festivals="festivalItems"
          />
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import {
  computed,
  onMounted,
  reactive,
  ref,
} from 'vue'

import Header from './Header.vue'
import CategoryTabs from './CategoryTabs.vue'
import LandingView from './LandingView.vue'
import InfoCardList from './InfoCardList.vue'
import FestivalCalendar from './FestivalCalendar.vue'
import OngoingFestivalPanel from './OngoingFestivalPanel.vue'
import Board from './Board.vue'

import {
  DISTRICT_OPTIONS,
  useI18n,
} from '../i18n'

import tourist from '../../data/서울_관광지.json'
import culture from '../../data/서울_문화시설.json'
import shopping from '../../data/서울_쇼핑.json'
import lodging from '../../data/서울_숙박.json'
import leisure from '../../data/서울_레포츠.json'
import travelCourse from '../../data/서울_여행코스.json'
import festival from '../../data/서울_축제공연행사.json'

const {
  locale,
  t,
} = useI18n()

const searchKeyword = ref('')
const selectedDistrict = ref('')
const activeCategory = ref('')
const currentPage = ref('landing')

/*
 * 영어 검색어를
 * 한국어 데이터 검색어로 확장
 */
const ENGLISH_SEARCH_ALIASES = {
  palace: ['궁', '궁궐'],
  palaces: ['궁', '궁궐'],

  park: ['공원'],
  parks: ['공원'],

  museum: ['박물관'],
  museums: ['박물관'],

  gallery: [
    '미술관',
    '갤러리',
  ],

  galleries: [
    '미술관',
    '갤러리',
  ],

  market: ['시장'],
  markets: ['시장'],

  hotel: ['호텔'],
  hotels: ['호텔'],

  hiking: [
    '등산',
    '둘레길',
  ],

  trail: [
    '둘레길',
    '트레킹',
  ],

  trails: [
    '둘레길',
    '트레킹',
  ],
}

/*
 * 장소 검색 결과를 제한하면 안 되는
 * 일반적인 영어 단어
 */
const ENGLISH_GENERIC_TOKENS =
  new Set([
    'a',
    'an',
    'the',
    'in',
    'at',
    'near',
    'seoul',
    'find',
    'show',
    'search',
    'recommend',
    'tourist',
    'tourism',
    'attraction',
    'attractions',
    'festival',
    'festivals',
    'event',
    'events',
    'culture',
    'cultural',
    'facility',
    'facilities',
    'shopping',
    'accommodation',
    'lodging',
    'leisure',
    'travel',
    'course',
    'courses',
  ])

/*
 * Gangnam, Gangnam-gu 같은
 * 영어 지역구 검색 지원
 */
const ENGLISH_DISTRICT_ALIASES =
  DISTRICT_OPTIONS.reduce(
    (aliases, option) => {
      const fullName =
        option.en.toLowerCase()

      const shortName =
        fullName.replace(
          /-gu$/,
          '',
        )

      aliases[fullName] = [
        option.value,
      ]

      aliases[shortName] = [
        option.value,
      ]

      return aliases
    },
    {},
  )

/*
 * JSON 데이터를 화면용 데이터로 정리
 */
function toItems(data) {
  if (
    !data ||
    !Array.isArray(data.items)
  ) {
    return []
  }

  return data.items.map(
    (item) => ({
      ...item,

      title:
        item.title || '',

      addr1:
        item.addr1 || '',

      firstimage:
        item.firstimage || '',

      firstimage2:
        item.firstimage2 || '',

      contentid:
        item.contentid ||
        item.id ||
        null,

      liked: false,

      likeCount:
        Number(
          item.likeCount || 0,
        ),
    }),
  )
}

/*
 * 카테고리별 실제 데이터
 *
 * 내부 값은 한국어로 유지해야
 * 기존 JSON 데이터와 연결된다.
 */
const rawMap = reactive({
  관광지:
    toItems(tourist),

  레포츠:
    toItems(leisure),

  문화시설:
    toItems(culture),

  쇼핑:
    toItems(shopping),

  숙박:
    toItems(lodging),

  여행코스:
    toItems(travelCourse),

  축제공연행사:
    toItems(festival),
})

/*
 * 축제 달력과 진행 중 축제에
 * 전달할 축제 전체 데이터
 */
const festivalItems = computed(
  () => {
    return (
      rawMap.축제공연행사 ||
      []
    )
  },
)

const likedMap = ref({})
const likeCounts = ref({})

function getItemId(item) {
  return (
    item?.contentid ||
    item?.id ||
    null
  )
}

/*
 * 좋아요 정보 불러오기
 */
function loadFromStorage() {
  try {
    likedMap.value =
      JSON.parse(
        window.localStorage.getItem(
          'likedMap',
        ) || '{}',
      )
  } catch {
    likedMap.value = {}
  }

  try {
    likeCounts.value =
      JSON.parse(
        window.localStorage.getItem(
          'likeCounts',
        ) || '{}',
      )
  } catch {
    likeCounts.value = {}
  }

  Object.values(rawMap).forEach(
    (list) => {
      list.forEach((item) => {
        const id =
          getItemId(item)

        if (!id) {
          return
        }

        item.liked =
          Boolean(
            likedMap.value[id],
          )

        item.likeCount =
          Number(
            likeCounts.value[id] ??
            item.likeCount ??
            0,
          )
      })
    },
  )
}

/*
 * 좋아요 정보 저장
 */
function saveLikeState() {
  try {
    window.localStorage.setItem(
      'likedMap',
      JSON.stringify(
        likedMap.value,
      ),
    )

    window.localStorage.setItem(
      'likeCounts',
      JSON.stringify(
        likeCounts.value,
      ),
    )
  } catch {
    /*
     * localStorage를 사용할 수 없으면
     * 현재 화면 상태만 유지
     */
  }
}

/*
 * 검색어를 단어별 그룹으로 변환
 *
 * museum gangnam 입력 시:
 * [museum, 박물관]
 * [gangnam, 강남구]
 *
 * 두 조건을 모두 만족하는
 * 항목만 표시한다.
 */
function getSearchTokenGroups(
  keyword,
) {
  const tokens =
    String(keyword || '')
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)

  return tokens
    .filter((token) => {
      return (
        locale.value !== 'en' ||
        !ENGLISH_GENERIC_TOKENS.has(
          token,
        )
      )
    })
    .map((token) => {
      if (
        locale.value !== 'en'
      ) {
        return [token]
      }

      return [
        token,

        ...(
          ENGLISH_SEARCH_ALIASES[
            token
          ] || []
        ),

        ...(
          ENGLISH_DISTRICT_ALIASES[
            token
          ] || []
        ),
      ]
    })
}

/*
 * 검색어 및 지역구 필터링
 */
const filteredList = computed(
  () => {
    const items =
      rawMap[
        activeCategory.value
      ] ||
      rawMap.관광지

    const tokenGroups =
      getSearchTokenGroups(
        searchKeyword.value,
      )

    const district =
      String(
        selectedDistrict.value ||
        '',
      )
        .trim()
        .toLowerCase()

    return items.filter(
      (item) => {
        const searchableText = [
          item.title,
          item.addr1,
          item.addr2,
          item.eventplace,
          item.program,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        /*
         * 여러 검색 단어가 있으면
         * 각 단어 그룹을 모두 만족해야 한다.
         */
        const matchesKeyword =
          tokenGroups.length === 0 ||
          tokenGroups.every(
            (group) => {
              return group.some(
                (token) => {
                  return searchableText
                    .includes(
                      token.toLowerCase(),
                    )
                },
              )
            },
          )

        const matchesDistrict =
          !district ||
          searchableText.includes(
            district,
          )

        return (
          matchesKeyword &&
          matchesDistrict
        )
      },
    )
  },
)

/*
 * 검색 버튼을 누르면
 * 랜딩 화면에서 메인 화면으로 이동
 */
function performSearch() {
  searchKeyword.value =
    String(
      searchKeyword.value || '',
    ).trim()

  if (
    !activeCategory.value
  ) {
    activeCategory.value =
      '관광지'
  }

  currentPage.value = 'main'
}

/*
 * 전체 좋아요 수
 */
const totalLikes = computed(
  () => {
    return Object.values(
      likeCounts.value,
    ).reduce(
      (sum, value) => {
        return (
          sum +
          Number(value || 0)
        )
      },
      0,
    )
  },
)

/*
 * 카드 좋아요 변경
 */
function handleToggle(contentid) {
  for (
    const list of
    Object.values(rawMap)
  ) {
    const item =
      list.find(
        (target) => {
          return (
            getItemId(target) ===
            contentid
          )
        },
      )

    if (!item) {
      continue
    }

    const id =
      getItemId(item)

    const nextLiked =
      !item.liked

    item.liked =
      nextLiked

    item.likeCount =
      Math.max(
        0,

        Number(
          item.likeCount || 0,
        ) +
        (
          nextLiked
            ? 1
            : -1
        ),
      )

    if (nextLiked) {
      likedMap.value[id] =
        true
    } else {
      delete likedMap.value[id]
    }

    likeCounts.value[id] =
      item.likeCount

    saveLikeState()

    break
  }
}

/*
 * 랜딩 화면의 입장 버튼
 */
function enterMain() {
  if (
    !activeCategory.value
  ) {
    activeCategory.value =
      '관광지'
  }

  currentPage.value = 'main'
}

/*
 * Header 로고에서 전달되는 이동 이벤트
 */
function onNavigate(page) {
  if (page === 'landing') {
    currentPage.value =
      'landing'

    return
  }

  if (page === 'main') {
    enterMain()
  }
}

/*
 * 로고 클릭 시 활성 카테고리 초기화
 */
function clearActiveCategory() {
  activeCategory.value = ''
}

/*
 * 카테고리를 누르면
 * 해당 카테고리로 메인 화면 이동
 */
function onCategorySelect(
  category,
) {
  activeCategory.value =
    category

  currentPage.value =
    'main'
}

onMounted(() => {
  loadFromStorage()
})
</script>

<style scoped>
.home {
  box-sizing: border-box;

  width: 100%;
  max-width: 1320px;
  min-height: 100vh;

  margin: 0 auto;

  background:
    var(
      --color-bg,
      #f8f9fb
    );
}

.home__content {
  box-sizing: border-box;

  width: 100%;

  padding:
    28px
    32px
    64px;
}

.home__content-inner {
  display: flex;
  flex-direction: column;
  gap: 40px;

  width: 100%;
}

.home__region-section,
.home__festival-section {
  box-sizing: border-box;

  width: 100%;
  min-width: 0;
}

/*
 * 달력과 진행 중인 축제를
 * 서울 지역정보 아래에 배치
 */
.home__festival-section {
  display: flex;
  flex-direction: column;
  gap: 24px;

  padding-top: 32px;

  border-top:
    1px solid
    var(
      --color-border,
      #e2e8f0
    );
}

.home__section-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;

  gap: 16px;
}

.home__section-title {
  margin: 0;

  color:
    var(
      --color-text,
      #1e293b
    );

  font-size: 22px;
  font-weight: 800;
}

.home__section-description {
  margin: 7px 0 0;

  color:
    var(
      --color-text-muted,
      #64748b
    );

  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 1024px) {
  .home__content {
    padding:
      24px
      20px
      52px;
  }

  .home__content-inner {
    gap: 32px;
  }

  .home__festival-section {
    padding-top: 24px;
  }
}

@media (max-width: 768px) {
  .home__content {
    padding:
      18px
      12px
      40px;
  }

  .home__content-inner {
    gap: 26px;
  }

  .home__festival-section {
    gap: 18px;

    padding-top: 20px;
  }

  .home__section-title {
    font-size: 19px;
  }
}
</style>
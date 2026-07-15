<template>
  <header class="header">
    <h1
      class="header__logo"
      role="button"
      tabindex="0"
      @click="goLanding"
      @keyup.enter="goLanding"
    >
      LocalHub
    </h1>

    <div class="header__searchWrap">
      <input
        class="header__search"
        type="text"
        :placeholder="t('header.searchPlaceholder')"
        :value="localSearch"
        @input="onInput"
        @keyup.enter="onSearchClick"
      />

      <button
        type="button"
        class="header__searchBtn"
        @click="onSearchClick"
      >
        {{ t('header.search') }}
      </button>
    </div>

    <div class="header__controls">
      <!-- 지역구 필터 -->
      <div
        ref="filterWrap"
        class="header__filterWrap"
      >
        <button
          type="button"
          :class="[
            'header__filter',
            {
              active: Boolean(district),
            },
          ]"
          :aria-expanded="showFilter"
          @click="toggleFilter"
        >
          {{ t('header.filter') }}
        </button>

        <div
          v-if="showFilter"
          class="filterDropdown"
        >
          <div class="filterHeader">
            <strong>
              {{ t('header.selectDistrict') }}
            </strong>

            <button
              v-if="district"
              type="button"
              class="clearBtn"
              @click="clearDistrict"
            >
              {{ t('header.reset') }}
            </button>
          </div>

          <ul class="districtList">
            <li
              v-for="districtOption in DISTRICT_OPTIONS"
              :key="districtOption.value"
              :class="{
                selected:
                  districtOption.value === district,
              }"
              @click="
                selectDistrict(
                  districtOption.value,
                )
              "
            >
              {{ districtOption[locale] }}
            </li>
          </ul>
        </div>
      </div>

      <!-- 다크모드 -->
      <button
        type="button"
        class="header__themeToggle"
        :title="themeButtonLabel"
        :aria-label="themeButtonLabel"
        @click="toggleTheme"
      >
        <span aria-hidden="true">
          {{ isDark ? '🌞' : '🌙' }}
        </span>
      </button>

      <!-- 언어 전환 -->
      <div
        class="header__language"
        role="group"
        aria-label="Language"
      >
        <button
          type="button"
          class="header__languageBtn"
          :class="{
            active: locale === 'ko',
          }"
          :aria-label="
            t('language.switchToKorean')
          "
          @click="setLocale('ko')"
        >
          KO
        </button>

        <button
          type="button"
          class="header__languageBtn"
          :class="{
            active: locale === 'en',
          }"
          :aria-label="
            t('language.switchToEnglish')
          "
          @click="setLocale('en')"
        >
          EN
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import {
  DISTRICT_OPTIONS,
  useI18n,
} from '../i18n'

const props = defineProps({
  search: {
    type: String,
    default: '',
  },

  district: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'update:search',
  'update:district',
  'search',
  'navigate',
  'clear-category',
])

const {
  locale,
  setLocale,
  t,
} = useI18n()

const localSearch = ref(
  props.search || '',
)

const showFilter = ref(false)
const filterWrap = ref(null)
const isDark = ref(false)

/*
 * 다크모드 버튼 설명도
 * 현재 언어에 맞게 표시
 */
const themeButtonLabel = computed(() => {
  if (locale.value === 'en') {
    return isDark.value
      ? 'Switch to light mode'
      : 'Switch to dark mode'
  }

  return isDark.value
    ? '라이트 모드로 전환'
    : '다크 모드로 전환'
})

/*
 * 부모의 검색어가 변경되면
 * 헤더 입력창에도 반영
 */
watch(
  () => props.search,
  (value) => {
    localSearch.value = value || ''
  },
)

function onInput(event) {
  localSearch.value =
    event.target.value

  emit(
    'update:search',
    localSearch.value,
  )
}

function onSearchClick() {
  emit(
    'update:search',
    localSearch.value,
  )

  emit('search')
}

function toggleFilter() {
  showFilter.value =
    !showFilter.value
}

function selectDistrict(
  districtValue,
) {
  emit(
    'update:district',
    districtValue,
  )

  showFilter.value = false
}

function clearDistrict(event) {
  event.stopPropagation()

  emit(
    'update:district',
    '',
  )

  showFilter.value = false
}

/*
 * 필터 밖을 누르면 닫기
 */
function closeFilterOnOutsideClick(
  event,
) {
  if (
    !filterWrap.value?.contains(
      event.target,
    )
  ) {
    showFilter.value = false
  }
}

/*
 * 다크모드 적용
 */
function applyTheme(dark) {
  if (
    typeof document === 'undefined'
  ) {
    return
  }

  document.documentElement
    .classList
    .toggle('dark', dark)

  isDark.value = dark

  try {
    window.localStorage.setItem(
      'theme',
      dark ? 'dark' : 'light',
    )
  } catch {
    /*
     * localStorage를 사용할 수 없으면
     * 화면 테마만 변경
     */
  }
}

function toggleTheme() {
  applyTheme(
    !isDark.value,
  )
}

/*
 * 저장된 테마 복구
 */
function restoreTheme() {
  let savedTheme = null

  try {
    savedTheme =
      window.localStorage.getItem(
        'theme',
      )
  } catch {
    savedTheme = null
  }

  if (savedTheme === 'dark') {
    applyTheme(true)
    return
  }

  if (savedTheme === 'light') {
    applyTheme(false)
    return
  }

  const prefersDark =
    typeof window.matchMedia ===
      'function' &&
    window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches

  applyTheme(prefersDark)
}

/*
 * 로고를 누르면 랜딩 화면으로 이동
 */
function goLanding() {
  emit(
    'navigate',
    'landing',
  )

  emit('clear-category')
}

onMounted(() => {
  restoreTheme()

  document.addEventListener(
    'click',
    closeFilterOnOutsideClick,
  )
})

onBeforeUnmount(() => {
  document.removeEventListener(
    'click',
    closeFilterOnOutsideClick,
  )
})
</script>

<style scoped>
.header {
  position: relative;

  display: flex;
  align-items: center;
  gap: 16px;

  padding: 20px 32px;

  background:
    var(
      --color-card,
      #ffffff
    );

  border-bottom:
    1px solid
    var(
      --color-border,
      #e2e8f0
    );
}

.header__logo {
  margin: 0;

  color:
    var(
      --color-primary,
      #6366f1
    );

  font-size: 22px;
  font-weight: 800;
  white-space: nowrap;

  cursor: pointer;
}

.header__searchWrap {
  display: flex;
  flex: 1;
  gap: 8px;

  min-width: 0;
}

.header__search {
  flex: 1;
  min-width: 0;

  padding: 10px 16px;

  color:
    var(
      --color-text,
      #1e293b
    );

  background:
    var(
      --color-card,
      #ffffff
    );

  border:
    1px solid
    var(
      --color-border,
      #e2e8f0
    );

  border-radius: 999px;

  outline: none;

  font-size: 14px;

  transition:
    border-color 0.2s;
}

.header__search::placeholder {
  color:
    var(
      --color-text-muted,
      #94a3b8
    );
}

.header__search:focus {
  border-color:
    var(
      --color-primary,
      #6366f1
    );
}

.header__searchBtn,
.header__filter {
  padding: 10px 16px;

  color: #ffffff;

  background:
    var(
      --color-primary,
      #6366f1
    );

  border: none;
  border-radius: 999px;

  font-weight: 700;

  cursor: pointer;
}

.header__searchBtn:hover,
.header__filter:hover {
  filter: brightness(0.94);
}

.header__filter.active {
  filter: brightness(0.84);

  box-shadow:
    0 2px 8px
    rgba(59, 40, 179, 0.18);
}

.header__controls {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

.header__filterWrap {
  position: relative;
}

.filterDropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 30;

  width: 230px;
  padding: 10px;

  color:
    var(
      --color-text,
      #1e293b
    );

  background:
    var(
      --color-card,
      #ffffff
    );

  border:
    1px solid
    var(
      --color-border,
      #e2e8f0
    );

  border-radius: 10px;

  box-shadow:
    0 8px 24px
    rgba(15, 23, 42, 0.12);
}

.filterHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;

  margin-bottom: 8px;
}

.clearBtn {
  color:
    var(
      --color-primary,
      #6366f1
    );

  background: transparent;

  border: none;

  font-weight: 700;

  cursor: pointer;
}

.districtList {
  max-height: 280px;

  padding: 0;
  margin: 0;

  overflow-y: auto;

  list-style: none;
}

.districtList li {
  padding: 8px 10px;

  border-radius: 7px;

  cursor: pointer;
}

.districtList li:hover {
  background:
    var(
      --color-primary-bg,
      rgba(99, 102, 241, 0.08)
    );
}

.districtList li.selected {
  color: #ffffff;

  background:
    var(
      --color-primary,
      #6366f1
    );
}

.header__themeToggle {
  display: inline-flex;
  justify-content: center;
  align-items: center;

  width: 38px;
  height: 38px;

  padding: 0;

  color:
    var(
      --color-text,
      #1e293b
    );

  background:
    var(
      --color-card,
      #ffffff
    );

  border:
    1px solid
    var(
      --color-border,
      #e2e8f0
    );

  border-radius: 999px;

  font-size: 15px;

  cursor: pointer;
}

.header__themeToggle:hover {
  background:
    var(
      --color-primary-bg,
      #eef2ff
    );
}

.header__language {
  display: inline-flex;
  flex-shrink: 0;

  padding: 3px;

  background:
    var(
      --color-primary-bg,
      #f1f5f9
    );

  border:
    1px solid
    var(
      --color-border,
      #e2e8f0
    );

  border-radius: 999px;
}

.header__languageBtn {
  min-width: 38px;

  padding: 7px 9px;

  color:
    var(
      --color-text-muted,
      #64748b
    );

  background: transparent;

  border: none;
  border-radius: 999px;

  font-size: 12px;
  font-weight: 800;

  cursor: pointer;
}

.header__languageBtn.active {
  color: #ffffff;

  background:
    var(
      --color-primary,
      #6366f1
    );
}

@media (max-width: 980px) {
  .header {
    flex-wrap: wrap;

    padding: 16px 20px;
  }

  .header__searchWrap {
    order: 3;

    flex-basis: 100%;
  }

  .header__controls {
    margin-left: auto;
  }
}

@media (max-width: 560px) {
  .header {
    gap: 10px;

    padding: 14px 12px;
  }

  .header__logo {
    font-size: 20px;
  }

  .header__controls {
    gap: 5px;
  }

  .header__searchBtn,
  .header__filter {
    padding: 9px 12px;

    font-size: 12px;
  }

  .header__themeToggle {
    width: 34px;
    height: 34px;
  }

  .header__languageBtn {
    min-width: 32px;

    padding: 6px 7px;

    font-size: 11px;
  }

  .filterDropdown {
    right: -92px;
  }
}
</style>
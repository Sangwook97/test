<script setup>
import { computed, ref } from 'vue'
import { useI18n } from '../i18n'

const props = defineProps({
  festivals: {
    type: Array,
    default: () => [],
  },
})

const { locale, localeCode, t } = useI18n()

const WEEK_LABELS = computed(() => {
  return locale.value === 'en'
    ? ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    : ['일', '월', '화', '수', '목', '금', '토']
})

const MAX_LANES = 4

const BAR_COLORS = [
  '#ec4899',
  '#22c55e',
  '#f59e0b',
  '#3b82f6',
  '#8b5cf6',
  '#14b8a6',
  '#ef4444',
  '#6366f1',
]

const now = new Date()

const currentMonth = ref(new Date(now.getFullYear(), now.getMonth(), 1))
const selectedDate = ref(new Date(now.getFullYear(), now.getMonth(), now.getDate()))

function normalizeDateKey(value) {
  const date = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 8)

  return date.length === 8 ? date : ''
}

function parseFestivalDate(value) {
  const key = normalizeDateKey(value)

  if (!key) {
    return null
  }

  const year = Number(key.slice(0, 4))
  const month = Number(key.slice(4, 6))
  const day = Number(key.slice(6, 8))
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

function makeDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}${month}${day}`
}

function addDays(date, amount) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

/*
 * 1월 31일처럼 월별 마지막 날짜가 다른 경우에도
 * 정확하게 6개월 뒤 날짜를 구한다.
 */
function addMonthsClamped(date, months) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate()

  target.setDate(Math.min(date.getDate(), lastDay))
  return target
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function startOfWeek(date) {
  return addDays(date, -date.getDay())
}

function endOfWeek(date) {
  return addDays(date, 6 - date.getDay())
}

function isSameDay(first, second) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  )
}

function dayDifference(start, end) {
  const startTime = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  ).getTime()

  const endTime = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
  ).getTime()

  return Math.round((endTime - startTime) / 86400000)
}

function formatMonthTitle(date) {
  return new Intl.DateTimeFormat(localeCode.value, {
    year: 'numeric',
    month: 'long',
  }).format(date)
}

function formatSelectedDate(date) {
  return new Intl.DateTimeFormat(localeCode.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function formatDate(value) {
  const date = parseFestivalDate(value)

  if (!date) {
    return t('calendar.noDate')
  }

  return new Intl.DateTimeFormat(localeCode.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getFestivalColor(seed) {
  const hash = [...String(seed || '')].reduce((sum, character) => {
    return sum + character.charCodeAt(0)
  }, 0)

  return BAR_COLORS[hash % BAR_COLORS.length]
}

function getNaverSearchUrl(festival) {
  const title = String(festival?.title || '').trim()
  const place = String(festival?.eventplace || festival?.addr1 || '').trim()
  const query = [title, place].filter(Boolean).join(' ')

  return `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`
}

/*
 * 전체 축제 데이터.
 * 특정 날짜 상세 목록에는 6개월 이상 행사도 포함된다.
 */
const normalizedFestivals = computed(() => {
  return props.festivals
    .map((festival, index) => {
      if (!festival) {
        return null
      }

      const start = parseFestivalDate(festival.eventstartdate)

      if (!start) {
        return null
      }

      const parsedEnd =
        parseFestivalDate(festival.eventenddate || festival.eventstartdate) || start
      const end = parsedEnd >= start ? parsedEnd : start
      const key =
        festival.contentid ||
        `${festival.title || 'festival'}-${makeDateKey(start)}-${index}`

      return {
        ...festival,
        _key: key,
        _start: start,
        _end: end,
        _color: getFestivalColor(key),
      }
    })
    .filter(Boolean)
    .sort((first, second) => {
      const startDifference = first._start.getTime() - second._start.getTime()

      if (startDifference !== 0) {
        return startDifference
      }

      return second._end.getTime() - first._end.getTime()
    })
})

/*
 * 달력 막대에는 6개월 미만 행사만 표시한다.
 * 정확히 6개월이거나 6개월보다 긴 행사는 달력에서 제외한다.
 */
const calendarFestivals = computed(() => {
  return normalizedFestivals.value.filter((festival) => {
    const sixMonthsLater = addMonthsClamped(festival._start, 6)
    return festival._end < sixMonthsLater
  })
})

const monthTitle = computed(() => formatMonthTitle(currentMonth.value))

const calendarWeeks = computed(() => {
  const monthStart = startOfMonth(currentMonth.value)
  const monthEnd = endOfMonth(currentMonth.value)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const weeks = []

  let cursor = new Date(calendarStart)

  while (cursor <= calendarEnd) {
    const weekStart = new Date(cursor)
    const weekEnd = addDays(weekStart, 6)

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index)

      return {
        key: makeDateKey(date),
        date,
        label: date.getDate(),
        isCurrentMonth: date.getMonth() === currentMonth.value.getMonth(),
        isToday: isSameDay(date, new Date()),
        isSelected: isSameDay(date, selectedDate.value),
        weekday: date.getDay(),
      }
    })

    const weekFestivals = calendarFestivals.value.filter((festival) => {
      return festival._start <= weekEnd && festival._end >= weekStart
    })

    const laneEndColumns = []
    const segments = []
    let hiddenCount = 0

    weekFestivals.forEach((festival) => {
      const segmentStart = festival._start > weekStart ? festival._start : weekStart
      const segmentEnd = festival._end < weekEnd ? festival._end : weekEnd
      const startColumn = dayDifference(weekStart, segmentStart) + 1
      const endColumn = dayDifference(weekStart, segmentEnd) + 1

      let lane = 0

      while (
        laneEndColumns[lane] !== undefined &&
        laneEndColumns[lane] >= startColumn
      ) {
        lane += 1
      }

      if (lane >= MAX_LANES) {
        hiddenCount += 1
        return
      }

      laneEndColumns[lane] = endColumn

      segments.push({
        id: `${festival._key}-${makeDateKey(weekStart)}`,
        festival,
        startColumn,
        endColumn,
        lane,
        isRealStart: isSameDay(segmentStart, festival._start),
        isRealEnd: isSameDay(segmentEnd, festival._end),
      })
    })

    weeks.push({
      id: makeDateKey(weekStart),
      days,
      segments,
      hiddenCount,
    })

    cursor = addDays(cursor, 7)
  }

  return weeks
})

const selectedFestivals = computed(() => {
  return normalizedFestivals.value
    .filter((festival) => {
      return festival._start <= selectedDate.value && selectedDate.value <= festival._end
    })
    .sort((first, second) => {
      return first._end.getTime() - second._end.getTime()
    })
})

const selectedDateText = computed(() => formatSelectedDate(selectedDate.value))

function selectDate(date) {
  selectedDate.value = new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function moveMonth(amount) {
  const nextMonth = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + amount,
    1,
  )

  currentMonth.value = nextMonth
  selectedDate.value = new Date(nextMonth)
}

function previousMonth() {
  moveMonth(-1)
}

function nextMonth() {
  moveMonth(1)
}

function goToday() {
  const today = new Date()

  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
  selectedDate.value = new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

function selectSegmentDate(week, segment) {
  const day = week.days[segment.startColumn - 1]

  if (day) {
    selectDate(day.date)
  }
}
</script>

<template>
  <div class="festival-calendar">
    <!-- 축제 일정 달력 -->
    <section class="festival-calendar__card">
      <div class="festival-calendar__heading-row">
        <div>
          <h3 class="festival-calendar__title">{{ t('calendar.title') }}</h3>
          <p class="festival-calendar__description">
            {{ t('calendar.description') }}
          </p>
        </div>

        <button type="button" class="calendar-today" @click="goToday">
          {{ t('calendar.today') }}
        </button>
      </div>

      <div class="calendar-header">
        <button
          type="button"
          class="calendar-header__nav"
          :aria-label="t('calendar.previousMonth')"
          @click="previousMonth"
        >
          ‹
        </button>

        <strong class="calendar-header__month">{{ monthTitle }}</strong>

        <button
          type="button"
          class="calendar-header__nav"
          :aria-label="t('calendar.nextMonth')"
          @click="nextMonth"
        >
          ›
        </button>
      </div>

      <div class="calendar-scroll">
        <div class="calendar-grid">
          <div class="calendar-weekdays">
            <div
              v-for="(label, index) in WEEK_LABELS"
              :key="label"
              class="calendar-weekdays__item"
              :class="{
                'calendar-weekdays__item--sunday': index === 0,
                'calendar-weekdays__item--saturday': index === 6,
              }"
            >
              {{ label }}
            </div>
          </div>

          <div class="calendar-body">
            <div
              v-for="week in calendarWeeks"
              :key="week.id"
              class="calendar-week"
            >
              <div class="calendar-week__days">
                <button
                  v-for="day in week.days"
                  :key="day.key"
                  type="button"
                  class="calendar-day"
                  :class="{
                    'calendar-day--muted': !day.isCurrentMonth,
                    'calendar-day--selected': day.isSelected,
                  }"
                  @click="selectDate(day.date)"
                >
                  <span
                    class="calendar-day__number"
                    :class="{
                      'calendar-day__number--today': day.isToday,
                      'calendar-day__number--sunday': day.weekday === 0,
                      'calendar-day__number--saturday': day.weekday === 6,
                    }"
                  >
                    {{ day.label }}
                  </span>
                </button>
              </div>

              <div class="calendar-week__bars">
                <button
                  v-for="segment in week.segments"
                  :key="segment.id"
                  type="button"
                  class="festival-bar"
                  :class="{
                    'festival-bar--continue-left': !segment.isRealStart,
                    'festival-bar--continue-right': !segment.isRealEnd,
                  }"
                  :style="{
                    gridColumn: `${segment.startColumn} / ${segment.endColumn + 1}`,
                    gridRow: segment.lane + 1,
                    backgroundColor: segment.festival._color,
                  }"
                  :title="segment.festival.title || t('calendar.noFestivalTitle')"
                  @click.stop="selectSegmentDate(week, segment)"
                >
                  <span class="festival-bar__label">
                    {{ segment.festival.title || t('calendar.noFestivalTitle') }}
                  </span>
                </button>
              </div>

              <span v-if="week.hiddenCount > 0" class="calendar-week__more">
                {{ t('calendar.more', { count: week.hiddenCount }) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p class="festival-calendar__notice">
        {{ t('calendar.notice') }}
      </p>
    </section>

    <!-- 특정 날짜 축제 -->
    <section class="festival-calendar__info">
      <div class="festival-calendar__info-header">
        <div>
          <h3 class="festival-calendar__info-title">{{ t('calendar.selectedTitle') }}</h3>
          <p class="festival-calendar__info-date">{{ selectedDateText }}</p>
        </div>

        <span class="festival-calendar__count">
          {{ t('calendar.count', { count: selectedFestivals.length }) }}
        </span>
      </div>

      <div v-if="selectedFestivals.length === 0" class="festival-calendar__empty">
        {{ t('calendar.empty') }}
      </div>

      <ul v-else class="festival-calendar__list">
        <li
          v-for="festival in selectedFestivals"
          :key="festival._key"
          class="festival-calendar__item"
        >
          <a
            class="festival-calendar__item-link"
            :href="getNaverSearchUrl(festival)"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="`${festival.title || t('calendar.noFestivalTitle')} - 네이버 검색`"
          >
            <span
              class="festival-calendar__item-color"
              :style="{ backgroundColor: festival._color }"
              aria-hidden="true"
            ></span>

            <div class="festival-calendar__item-content">
              <strong class="festival-calendar__item-title">
                {{ festival.title || t('calendar.noFestivalTitle') }}
              </strong>

              <span class="festival-calendar__item-date">
                {{ formatDate(festival.eventstartdate) }}
                ~
                {{ formatDate(festival.eventenddate || festival.eventstartdate) }}
              </span>

              <span class="festival-calendar__item-place">
                {{ festival.eventplace || festival.addr1 || t('calendar.noPlace') }}
              </span>
            </div>
          </a>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.festival-calendar {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-width: 0;
}

.festival-calendar__card,
.festival-calendar__info {
  box-sizing: border-box;
  width: 100%;
  padding: 24px;
  background: var(--color-card, #ffffff);
  border: 1px solid var(--color-border, #e6ebf1);
  border-radius: var(--radius, 14px);
  box-shadow: var(--shadow, 0 5px 18px rgba(15, 23, 42, 0.05));
}

.festival-calendar__heading-row,
.festival-calendar__info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.festival-calendar__title,
.festival-calendar__info-title {
  margin: 0;
  color: var(--color-text, #1e293b);
  font-size: 17px;
  font-weight: 800;
}

.festival-calendar__description,
.festival-calendar__info-date {
  margin: 6px 0 0;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  line-height: 1.5;
}

.calendar-today {
  flex-shrink: 0;
  padding: 7px 14px;
  color: #334155;
  background: #ffffff;
  border: 1px solid #dbe2ea;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.calendar-today:hover {
  background: #f8fafc;
}

.calendar-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin: 22px 0 16px;
}

.calendar-header__nav {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: #4f8df7;
  background: transparent;
  border: none;
  border-radius: 50%;
  font-size: 28px;
  cursor: pointer;
}

.calendar-header__nav:hover {
  background: #eff6ff;
}

.calendar-header__month {
  min-width: 150px;
  color: #111827;
  font-size: 21px;
  font-weight: 800;
  text-align: center;
}

.calendar-scroll {
  width: 100%;
  overflow-x: auto;
  padding-bottom: 4px;
}

.calendar-grid {
  width: 100%;
  min-width: 760px;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  margin-bottom: 8px;
}

.calendar-weekdays__item {
  padding: 8px 0;
  color: #4f8df7;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
}

.calendar-weekdays__item--sunday {
  color: #ef4444;
}

.calendar-weekdays__item--saturday {
  color: #3b82f6;
}

.calendar-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.calendar-week {
  position: relative;
  min-height: 142px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e7edf3;
  border-radius: 9px;
}

.calendar-week__days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar-day {
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  min-height: 142px;
  padding: 8px 10px 104px;
  background: #ffffff;
  border: none;
  border-right: 1px solid #edf1f5;
  text-align: left;
  cursor: pointer;
}

.calendar-day:last-child {
  border-right: none;
}

.calendar-day:hover {
  background: #f8fafc;
}

.calendar-day--muted {
  background: #fafafa;
}

.calendar-day--selected {
  background: #eff6ff;
}

.calendar-day__number {
  position: relative;
  z-index: 5;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 26px;
  height: 26px;
  color: #334155;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
}

.calendar-day--muted .calendar-day__number {
  color: #cbd5e1;
}

.calendar-day__number--sunday:not(.calendar-day__number--today) {
  color: #ef4444;
}

.calendar-day__number--saturday:not(.calendar-day__number--today) {
  color: #2563eb;
}

.calendar-day__number--today {
  color: #ffffff;
  background: #2563eb;
}

.calendar-week__bars {
  position: absolute;
  z-index: 2;
  top: 42px;
  right: 0;
  left: 0;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: repeat(4, 20px);
  row-gap: 5px;
  pointer-events: none;
}

.festival-bar {
  box-sizing: border-box;
  min-width: 0;
  height: 20px;
  margin: 0 4px;
  padding: 0 8px;
  overflow: hidden;
  color: #ffffff;
  border: none;
  border-radius: 999px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
  font-size: 10px;
  font-weight: 700;
  line-height: 20px;
  text-align: left;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  pointer-events: auto;
}

.festival-bar:hover {
  filter: brightness(0.94);
}

.festival-bar--continue-left {
  margin-left: 0;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.festival-bar--continue-right {
  margin-right: 0;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.festival-bar__label {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.calendar-week__more {
  position: absolute;
  right: 8px;
  bottom: 6px;
  z-index: 3;
  padding: 2px 6px;
  color: #64748b;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.festival-calendar__notice {
  margin: 12px 0 0;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  line-height: 1.5;
  text-align: right;
}

.festival-calendar__count {
  flex-shrink: 0;
  padding: 5px 10px;
  color: var(--color-primary, #6366f1);
  background: #eef2ff;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.festival-calendar__empty {
  padding: 38px 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  text-align: center;
}

.festival-calendar__list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  max-height: 430px;
  padding: 2px 6px 2px 0;
  margin: 18px 0 0;
  overflow-y: auto;
  list-style: none;
}

.festival-calendar__item {
  position: relative;
  min-width: 0;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid #e5eaf0;
  border-radius: 9px;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.festival-calendar__item:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary, #6366f1);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
}

.festival-calendar__item-link {
  display: flex;
  width: 100%;
  min-width: 0;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.festival-calendar__item-link:focus-visible {
  outline: 3px solid rgba(99, 102, 241, 0.35);
  outline-offset: -3px;
}

.festival-calendar__item-color {
  flex: 0 0 5px;
  width: 5px;
}

.festival-calendar__item-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 14px;
}

.festival-calendar__item-title {
  overflow: hidden;
  color: var(--color-text, #1e293b);
  font-size: 14px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.festival-calendar__item-date {
  color: var(--color-primary, #6366f1);
  font-size: 12px;
}

.festival-calendar__item-place {
  overflow: hidden;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

@media (max-width: 1024px) {
  .festival-calendar__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .festival-calendar {
    gap: 18px;
  }

  .festival-calendar__card,
  .festival-calendar__info {
    padding: 16px;
  }

  .festival-calendar__heading-row {
    align-items: center;
  }

  .calendar-header {
    margin-top: 18px;
  }

  .calendar-header__month {
    min-width: 120px;
    font-size: 18px;
  }

  .festival-calendar__list {
    grid-template-columns: 1fr;
  }

  .festival-calendar__notice {
    text-align: left;
  }
}
</style>

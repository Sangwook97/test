<script setup>
import { computed, ref } from 'vue'
import { useI18n } from '../i18n'

const props = defineProps({
  festivals: {
    type: Array,
    default: () => [],
  },
})

const { localeCode, t } = useI18n()

const INITIAL_VISIBLE_COUNT = 6
const showAll = ref(false)

function normalizeDateKey(value) {
  const date = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 8)

  return date.length === 8 ? date : ''
}

function parseDate(value) {
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

function getTodayKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}${month}${day}`
}

const ongoingFestivals = computed(() => {
  const today = getTodayKey()

  return props.festivals
    .filter((festival) => {
      if (!festival) {
        return false
      }

      const startDate = normalizeDateKey(festival.eventstartdate)

      if (!startDate) {
        return false
      }

      const endDate = normalizeDateKey(festival.eventenddate) || startDate

      return startDate <= today && today <= endDate
    })
    .sort((first, second) => {
      const firstEnd =
        normalizeDateKey(first.eventenddate) ||
        normalizeDateKey(first.eventstartdate)

      const secondEnd =
        normalizeDateKey(second.eventenddate) ||
        normalizeDateKey(second.eventstartdate)

      return firstEnd.localeCompare(secondEnd)
    })
})

const visibleFestivals = computed(() => {
  return showAll.value
    ? ongoingFestivals.value
    : ongoingFestivals.value.slice(0, INITIAL_VISIBLE_COUNT)
})

function toggleShowAll() {
  showAll.value = !showAll.value
}

function formatDate(value) {
  const date = parseDate(value)

  if (!date) {
    return t('ongoing.noDate')
  }

  return new Intl.DateTimeFormat(localeCode.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getRemainingDays(value) {
  const endDate = parseDate(value)

  if (!endDate) {
    return ''
  }

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const difference = Math.ceil((endDate.getTime() - todayStart.getTime()) / 86400000)

  if (difference < 0) {
    return t('ongoing.ended')
  }

  if (difference === 0) {
    return t('ongoing.endsToday')
  }

  return `D-${difference}`
}
</script>

<template>
  <section class="ongoing">
    <div class="ongoing__header">
      <div>
        <h3 class="ongoing__heading">
          {{ t('ongoing.title') }}
        </h3>

        <p class="ongoing__description">
          {{ t('ongoing.description') }}
        </p>
      </div>

      <span class="ongoing__count">
        {{ t('ongoing.count', { count: ongoingFestivals.length }) }}
      </span>
    </div>

    <div v-if="ongoingFestivals.length === 0" class="ongoing__empty">
      {{ t('ongoing.empty') }}
    </div>

    <ul
      v-else
      class="ongoing__list"
      :class="{ 'ongoing__list--expanded': showAll }"
    >
      <li
        v-for="(festival, index) in visibleFestivals"
        :key="festival.contentid || `${festival.title}-${index}`"
        class="ongoing__item"
      >
        <div class="ongoing__item-header">
          <strong class="ongoing__title">
            {{ festival.title || t('ongoing.noFestivalTitle') }}
          </strong>

          <span class="ongoing__remaining">
            {{
              getRemainingDays(
                festival.eventenddate || festival.eventstartdate,
              )
            }}
          </span>
        </div>

        <span class="ongoing__date">
          {{ formatDate(festival.eventstartdate) }}
          ~
          {{ formatDate(festival.eventenddate || festival.eventstartdate) }}
        </span>

        <span class="ongoing__place">
          {{ festival.eventplace || festival.addr1 || t('ongoing.noPlace') }}
        </span>
      </li>
    </ul>

    <button
      v-if="ongoingFestivals.length > INITIAL_VISIBLE_COUNT"
      type="button"
      class="ongoing__more"
      :aria-expanded="showAll"
      @click="toggleShowAll"
    >
      {{
        showAll
          ? t('ongoing.collapse')
          : t('ongoing.showAll', { count: ongoingFestivals.length })
      }}
    </button>
  </section>
</template>

<style scoped>
.ongoing {
  box-sizing: border-box;
  width: 100%;
  padding: 24px;
  background: var(--color-card, #ffffff);
  border: 1px solid var(--color-border, #e6ebf1);
  border-radius: var(--radius, 14px);
  box-shadow: var(--shadow, 0 5px 18px rgba(15, 23, 42, 0.05));
}

.ongoing__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.ongoing__heading {
  margin: 0;
  color: var(--color-text, #1e293b);
  font-size: 17px;
  font-weight: 800;
}

.ongoing__description {
  margin: 6px 0 0;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  line-height: 1.5;
}

.ongoing__count {
  flex-shrink: 0;
  padding: 5px 10px;
  color: var(--color-primary, #6366f1);
  background: #eef2ff;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.ongoing__list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 0;
  margin: 18px 0 0;
  list-style: none;
}

.ongoing__list--expanded {
  max-height: 620px;
  padding-right: 6px;
  overflow-y: auto;
}

.ongoing__item {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  padding: 15px;
  background: #f8fafc;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 9px;
}

.ongoing__item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.ongoing__title {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text, #1e293b);
  font-size: 14px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ongoing__remaining {
  flex-shrink: 0;
  padding: 3px 7px;
  color: #ffffff;
  background: var(--color-primary, #6366f1);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.ongoing__date {
  color: var(--color-primary, #6366f1);
  font-size: 12px;
}

.ongoing__place {
  overflow: hidden;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ongoing__empty {
  padding: 40px 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  text-align: center;
}

.ongoing__more {
  width: 100%;
  margin-top: 18px;
  padding: 11px 14px;
  color: var(--color-primary, #6366f1);
  background: #ffffff;
  border: 1px solid var(--color-primary, #6366f1);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.ongoing__more:hover {
  background: #f5f3ff;
}

@media (max-width: 1024px) {
  .ongoing__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .ongoing {
    padding: 16px;
  }

  .ongoing__list {
    grid-template-columns: 1fr;
  }
}
</style>

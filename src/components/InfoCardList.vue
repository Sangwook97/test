<template>
  <section class="card-list">
    <h2 class="card-list__title">
      {{ t('cards.regionTitle', { count: total, likes: totalLikes }) }}
    </h2>

    <div class="carousel">
      <button
        type="button"
        class="nav prev"
        :disabled="currentPage === 0"
        aria-label="Previous page"
        @click="prev"
      >
        &lt;
      </button>

      <div class="viewport">
        <div v-if="currentItems.length === 0" class="empty-list">
          {{ t('cards.empty') }}
        </div>

        <!--
          전체 수천 개 카드를 DOM에 한꺼번에 만들지 않고
          현재 페이지의 카드 6개만 렌더링한다.
          쇼핑처럼 데이터가 많은 카테고리에서도 페이지 이동이 가벼워진다.
        -->
        <Transition v-else :name="transitionName">
          <div :key="currentPage" class="slide-page">
            <InfoCard
              v-for="item in currentItems"
              :key="item.contentid || item.id"
              :item="item"
              class="card-item"
              @toggle-like="$emit('toggle-like', $event)"
            />
          </div>
        </Transition>
      </div>

      <button
        type="button"
        class="nav next"
        :disabled="currentPage >= pageCount - 1 || pageCount === 0"
        aria-label="Next page"
        @click="next"
      >
        &gt;
      </button>
    </div>

    <div v-if="pageCount > 0" class="pager">
      <span>{{ currentPage + 1 }} / {{ pageCount }}</span>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import InfoCard from './InfoCard.vue'
import { useI18n } from '../i18n'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  total: {
    type: Number,
    default: 0,
  },
  totalLikes: {
    type: Number,
    default: 0,
  },
})

defineEmits(['toggle-like'])

const { t } = useI18n()

const ITEMS_PER_PAGE = 6
const currentPage = ref(0)
const direction = ref('next')

const pageCount = computed(() => {
  return Math.ceil(props.items.length / ITEMS_PER_PAGE)
})

const currentItems = computed(() => {
  const start = currentPage.value * ITEMS_PER_PAGE
  return props.items.slice(start, start + ITEMS_PER_PAGE)
})

const transitionName = computed(() => {
  return direction.value === 'prev' ? 'page-prev' : 'page-next'
})

/*
 * 카테고리, 검색어, 지역 필터가 바뀌어
 * 새로운 배열이 들어오면 첫 페이지로 돌아간다.
 * deep 감시는 수천 개 항목을 매번 순회하므로 사용하지 않는다.
 */
watch(
  () => props.items,
  () => {
    direction.value = 'next'
    currentPage.value = 0
  },
  { flush: 'sync' },
)

/*
 * 데이터 개수가 줄었을 때 현재 페이지가 범위를 벗어나지 않도록 보정한다.
 */
watch(pageCount, (count) => {
  if (count === 0) {
    currentPage.value = 0
    return
  }

  if (currentPage.value >= count) {
    currentPage.value = count - 1
  }
})

function prev() {
  if (currentPage.value <= 0) {
    return
  }

  direction.value = 'prev'
  currentPage.value -= 1
}

function next() {
  if (currentPage.value >= pageCount.value - 1) {
    return
  }

  direction.value = 'next'
  currentPage.value += 1
}
</script>

<style scoped>
.card-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
}

.card-list__title {
  margin: 0 0 16px;
  color: var(--color-text, #1e293b);
  font-size: 16px;
  font-weight: 700;
}

.carousel {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.viewport {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  border-radius: var(--radius, 12px);
  contain: layout paint;
}

.slide-page {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
  padding: 4px;
}

.empty-list {
  width: 100%;
  padding: 100px 0;
  color: var(--color-text-muted, #94a3b8);
  font-size: 14px;
  text-align: center;
}

.nav {
  z-index: 10;
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  color: var(--color-text, #334155);
  background: var(--color-card, #ffffff);
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 50%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease;
}

.nav:hover:not(:disabled) {
  color: var(--color-primary, #6366f1);
  background: var(--color-primary-bg, #f1f0fe);
  border-color: var(--color-primary, #6366f1);
  transform: scale(1.05);
}

.nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  color: var(--color-text, #475569);
  font-size: 14px;
  font-weight: 600;
}

/* 현재 페이지의 6개 카드만 짧게 이동시켜 부드럽게 전환한다. */
.page-next-enter-active,
.page-next-leave-active,
.page-prev-enter-active,
.page-prev-leave-active {
  transition:
    transform 0.18s ease-out,
    opacity 0.18s ease-out;
}

.page-next-leave-active,
.page-prev-leave-active {
  position: absolute;
  inset: 0;
  width: 100%;
}

.page-next-enter-from {
  opacity: 0;
  transform: translateX(22px);
}

.page-next-leave-to {
  opacity: 0;
  transform: translateX(-22px);
}

.page-prev-enter-from {
  opacity: 0;
  transform: translateX(-22px);
}

.page-prev-leave-to {
  opacity: 0;
  transform: translateX(22px);
}

@media (prefers-reduced-motion: reduce) {
  .page-next-enter-active,
  .page-next-leave-active,
  .page-prev-enter-active,
  .page-prev-leave-active {
    transition: none;
  }
}

@media (max-width: 900px) {
  .slide-page {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .carousel {
    gap: 6px;
  }

  .slide-page {
    grid-template-columns: 1fr;
  }

  .nav {
    width: 30px;
    height: 30px;
  }
}
</style>

<template>
  <div
    class="card-link-wrapper"
    role="link"
    tabindex="0"
    @click="openLink"
    @keydown.enter.prevent="openLink"
  >
    <div class="card">
      <img
        class="card__img"
        :src="item.firstimage || item.firstimage2 || placeholder"
        :alt="item.title || t('cards.imageAlt')"
        width="480"
        height="240"
        loading="lazy"
        decoding="async"
        fetchpriority="low"
      />

      <p class="card__name">
        {{ item.title || item.name }}
      </p>

      <p class="card__address">
        {{ item.addr1 || item.address || t('cards.noAddress') }}
      </p>

      <button
        type="button"
        class="card__like"
        @click.stop.prevent="$emit('toggle-like', item.contentid || item.id)"
      >
        {{ item.likeCount || 0 }} {{ item.liked ? '♥' : '♡' }}
        {{ t('cards.likes') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../i18n'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

defineEmits(['toggle-like'])

const { t } = useI18n()
const placeholder = '/placeholder.svg'

const searchLink = computed(() => {
  const query = props.item.title || props.item.name || ''
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`
})

function openLink() {
  if (!searchLink.value) {
    return
  }

  window.open(searchLink.value, '_blank', 'noopener')
}
</script>

<style scoped>
.card-link-wrapper {
  display: block;
  color: inherit;
  text-decoration: none;
  outline: none;
  cursor: pointer;
}

.card-link-wrapper:focus {
  border-radius: 12px;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.card {
  box-sizing: border-box;
  height: 100%;
  padding: 12px;
  background: var(--color-card, #ffffff);
  border-radius: var(--radius, 12px);
  box-shadow: var(--shadow, 0 4px 12px rgba(0, 0, 0, 0.05));
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.card:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  transform: translateY(-4px);
}

.card__img {
  width: 100%;
  height: 120px;
  margin-bottom: 8px;
  object-fit: cover;
  background: var(--color-bg, #f1f5f9);
  border-radius: 8px;
}

.card__name {
  margin: 0 0 6px;
  overflow: hidden;
  color: var(--color-text, #0f172a);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.card__address {
  margin: 0 0 10px;
  overflow: hidden;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.card__like {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  padding: 4px 0;
  color: #e17055;
  background: transparent;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.card__like:hover {
  color: #d63031;
}
</style>

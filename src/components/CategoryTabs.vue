<template>
  <nav class="tabs" aria-label="Categories">
    <button
      v-for="category in CATEGORY_OPTIONS"
      :key="category.value"
      type="button"
      :class="['tabs__item', { active: active === category.value }]"
      @click="$emit('update:active', category.value)"
    >
      {{ t(category.key) }}
    </button>
  </nav>
</template>

<script setup>
import { CATEGORY_OPTIONS, useI18n } from '../i18n'

defineProps({
  active: {
    type: String,
    default: '관광지',
  },
})

defineEmits(['update:active'])

const { t } = useI18n()
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 8px;
  padding: 16px 32px;
  overflow-x: auto;
  background: var(--color-card, #ffffff);
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  scrollbar-width: thin;
}

.tabs__item {
  flex: 0 0 auto;
  padding: 8px 18px;
  color: var(--color-text-muted, #64748b);
  background: transparent;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
}

.tabs__item:hover {
  color: var(--color-primary, #6366f1);
  background: #f1f0fe;
}

.tabs__item.active {
  color: #ffffff;
  background: var(--color-primary, #6366f1);
}

@media (max-width: 768px) {
  .tabs {
    padding: 12px;
  }

  .tabs__item {
    padding: 8px 14px;
    font-size: 12px;
  }
}
</style>

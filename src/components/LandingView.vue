<template>
  <section class="landing">
    <div class="landing__card">
      <h2 class="title">
        Welcome to LocalHub
      </h2>

      <p class="subtitle">
        {{ subtitle }}
      </p>

      <button
        type="button"
        class="enterBtn"
        @click="$emit('enter')"
      >
        {{ enterLabel }}
      </button>
    </div>

    <div
      class="bg-ornament"
      aria-hidden="true"
    ></div>
  </section>
</template>

<script setup>
import {
  computed,
} from 'vue'

import {
  useI18n,
} from '../i18n'

defineEmits([
  'enter',
])

const {
  locale,
} = useI18n()

const subtitle = computed(() => {
  return locale.value === 'en'
    ? 'Discover Seoul places and festivals in one convenient hub.'
    : '서울의 다양한 장소와 축제를 한 곳에서 찾아보세요.'
})

const enterLabel = computed(() => {
  return locale.value === 'en'
    ? 'Enter'
    : '입장하기'
})
</script>

<style scoped>
.landing {
  position: relative;

  display: flex;
  justify-content: center;
  align-items: center;

  min-height:
    calc(100vh - 150px);

  padding: 40px;

  overflow: hidden;
}

.landing__card {
  z-index: 1;

  min-width: 360px;

  padding: 48px;

  text-align: center;

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

  border-radius: 14px;

  box-shadow:
    0 12px 48px
    rgba(12, 10, 50, 0.12);

  animation:
    floatUp 900ms ease both;
}

.title {
  margin: 0 0 8px;

  color: transparent;

  background:
    linear-gradient(
      90deg,
      #5b4cd6,
      #7b6ef7
    );

  background-clip: text;
  -webkit-background-clip: text;

  font-size: 28px;
  font-weight: 800;
}

.subtitle {
  margin: 0 0 20px;

  color:
    var(
      --color-text-muted,
      #64748b
    );

  line-height: 1.6;
}

.enterBtn {
  padding: 12px 20px;

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

  transition:
    transform 0.15s ease;
}

.enterBtn:hover {
  transform:
    translateY(-2px);
}

.bg-ornament {
  position: absolute;
  top: -80px;
  right: -120px;

  width: 420px;
  height: 420px;

  background:
    radial-gradient(
      circle at 30% 30%,
      rgba(91, 76, 214, 0.16),
      transparent 30%
    ),
    radial-gradient(
      circle at 70% 70%,
      rgba(123, 110, 247, 0.12),
      transparent 30%
    );

  filter: blur(28px);

  transform:
    rotate(10deg);

  pointer-events: none;
}

@keyframes floatUp {
  from {
    opacity: 0;

    transform:
      translateY(18px);
  }

  to {
    opacity: 1;

    transform:
      translateY(0);
  }
}

@media (max-width: 560px) {
  .landing {
    min-height:
      calc(100vh - 180px);

    padding:
      24px 12px;
  }

  .landing__card {
    box-sizing: border-box;

    width: 100%;
    min-width: 0;

    padding:
      34px 20px;
  }

  .title {
    font-size: 24px;
  }
}
</style>
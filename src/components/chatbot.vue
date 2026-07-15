<template>
  <div class="chatbot-container">
    <Transition name="chatbot-window">
      <section
        v-if="isOpen"
        class="chatbot-panel"
        role="dialog"
        :aria-label="t('chatbot.dialogLabel')"
      >
        <header class="chatbot-header">
          <div class="chatbot-header-text">
            <h2 class="chatbot-title">{{ t('chatbot.title') }}</h2>
            <p class="chatbot-status">{{ t('chatbot.status') }}</p>
          </div>

          <button
            class="chatbot-close-button"
            type="button"
            :aria-label="t('chatbot.close')"
            @click="closeChatbot"
          >
            ×
          </button>
        </header>

        <div
          ref="messageArea"
          class="chatbot-message-area"
          aria-live="polite"
          :aria-busy="isLoading"
        >
          <div
            v-for="message in messages"
            :key="message.id"
            class="chatbot-message-row"
            :class="`chatbot-message-row--${message.sender}`"
          >
            <div
              class="chatbot-message-bubble"
              :class="`chatbot-message-bubble--${message.sender}`"
            >
              {{ message.text }}
            </div>
          </div>

          <div
            v-if="isLoading"
            class="chatbot-message-row chatbot-message-row--bot"
          >
            <div
              class="chatbot-message-bubble chatbot-message-bubble--bot chatbot-loading-bubble"
              :aria-label="t('chatbot.loadingLabel')"
            >
              <span class="chatbot-loading-dot"></span>
              <span class="chatbot-loading-dot"></span>
              <span class="chatbot-loading-dot"></span>
            </div>
          </div>
        </div>

        <div class="chatbot-example-area">
          <p class="chatbot-example-title">
            {{ t('chatbot.examplesTitle') }}
          </p>

          <div class="chatbot-example-buttons">
            <button
              v-for="example in examples"
              :key="example.question"
              type="button"
              class="chatbot-example-button"
              :disabled="isLoading"
              @click="setExampleQuestion(example.question)"
            >
              {{ example.label }}
            </button>
          </div>
        </div>

        <p class="chatbot-source">
          {{ t('chatbot.source') }}
        </p>

        <form class="chatbot-input-area" @submit.prevent="sendMessage">
          <label
            class="chatbot-screen-reader-only"
            for="chatbot-message-input"
          >
            {{ t('chatbot.inputLabel') }}
          </label>

          <input
            id="chatbot-message-input"
            ref="messageInput"
            v-model="inputMessage"
            class="chatbot-input"
            type="text"
            :placeholder="t('chatbot.placeholder')"
            autocomplete="off"
            :disabled="isLoading"
          />

          <button
            type="submit"
            class="chatbot-send-button"
            :disabled="isLoading || !inputMessage.trim()"
          >
            {{ isLoading ? t('chatbot.searching') : t('chatbot.send') }}
          </button>
        </form>
      </section>
    </Transition>

    <button
      type="button"
      class="chatbot-toggle-button"
      :aria-expanded="isOpen"
      :aria-label="isOpen ? t('chatbot.toggleClose') : t('chatbot.open')"
      @click="toggleChatbot"
    >
      <span class="chatbot-toggle-icon" aria-hidden="true">
        {{ isOpen ? '×' : '🤖' }}
      </span>
    </button>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { askRegionQuestion } from '../services/openaiService'
import { useI18n } from '../i18n'

const { locale, t } = useI18n()

const isOpen = ref(false)
const inputMessage = ref('')
const messageArea = ref(null)
const messageInput = ref(null)
const isLoading = ref(false)

let nextMessageId = 2

const messages = ref([
  {
    id: 1,
    sender: 'bot',
    text: t('chatbot.welcome'),
  },
])

const examples = computed(() => {
  if (locale.value === 'en') {
    return [
      {
        label: 'Nowon-gu attractions',
        question: 'Recommend tourist attractions in Nowon-gu',
      },
      {
        label: 'Jongno-gu museums',
        question: 'Recommend cultural facilities in Jongno-gu',
      },
      {
        label: 'Mapo-gu shopping',
        question: 'Recommend shopping places in Mapo-gu',
      },
      {
        label: 'Gangnam-gu hotels',
        question: 'Recommend accommodation in Gangnam-gu',
      },
    ]
  }

  return [
    { label: '노원구 관광지', question: '노원구 관광지' },
    { label: '종로구 문화시설', question: '종로구 문화시설' },
    { label: '마포구 쇼핑', question: '마포구 쇼핑' },
    { label: '강남구 숙박', question: '강남구 숙박' },
  ]
})

watch(locale, () => {
  if (messages.value.length === 1 && messages.value[0]?.id === 1) {
    messages.value[0].text = t('chatbot.welcome')
  }
})

async function scrollToBottom() {
  await nextTick()

  if (messageArea.value) {
    messageArea.value.scrollTop = messageArea.value.scrollHeight
  }
}

async function focusInput() {
  await nextTick()

  if (messageInput.value && !isLoading.value) {
    messageInput.value.focus()
  }
}

function addMessage(sender, text) {
  messages.value.push({
    id: nextMessageId++,
    sender,
    text,
  })
}

async function openChatbot() {
  isOpen.value = true
  await scrollToBottom()
  await focusInput()
}

function closeChatbot() {
  isOpen.value = false
}

async function toggleChatbot() {
  if (isOpen.value) {
    closeChatbot()
    return
  }

  await openChatbot()
}

async function setExampleQuestion(question) {
  if (isLoading.value) {
    return
  }

  inputMessage.value = question
  await focusInput()
}

function normalizeAnswer(answer) {
  const normalizedAnswer = String(answer || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return normalizedAnswer || t('chatbot.noResult')
}

function createErrorMessage(error) {
  if (!(error instanceof Error)) {
    return t('chatbot.unknownError')
  }

  const errorMessage = error.message
  const lowerMessage = errorMessage.toLowerCase()

  if (
    errorMessage.includes('API 키') ||
    lowerMessage.includes('api key is missing')
  ) {
    return t('chatbot.apiKeyMissing')
  }

  if (errorMessage.includes('401') || lowerMessage.includes('unauthorized')) {
    return t('chatbot.apiKeyInvalid')
  }

  if (errorMessage.includes('429') || lowerMessage.includes('quota')) {
    return t('chatbot.quotaExceeded')
  }

  if (
    errorMessage.includes('파일을 불러오지 못했습니다') ||
    errorMessage.includes('items 배열') ||
    lowerMessage.includes('could not be loaded')
  ) {
    return t('chatbot.dataLoadFailed')
  }

  if (
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('NetworkError')
  ) {
    return t('chatbot.networkError')
  }

  return errorMessage
}

async function sendMessage() {
  const question = inputMessage.value.trim()

  if (!question || isLoading.value) {
    return
  }

  addMessage('user', question)
  inputMessage.value = ''
  isLoading.value = true

  await scrollToBottom()

  try {
    const result = await askRegionQuestion(question, locale.value)

    if (typeof result === 'string') {
      addMessage('bot', normalizeAnswer(result))
    } else if (!result || typeof result !== 'object') {
      addMessage('bot', t('chatbot.noAnswer'))
    } else {
      switch (result.status) {
        case 'openai_ok':
        case 'district_search':
        case 'no_data_category':
        case 'no_candidates':
          addMessage('bot', normalizeAnswer(result.text))
          break

        case 'openai_error':
          addMessage(
            'bot',
            `${t('chatbot.requestFailed')} (${result.error || 'OpenAI request failed'})`,
          )
          break

        case 'error':
        default:
          addMessage('bot', result.text || t('chatbot.noAnswer'))
      }
    }
  } catch (error) {
    console.error(`${t('chatbot.responseErrorLog')}:`, error)
    addMessage('bot', `${t('chatbot.requestFailed')}\n${createErrorMessage(error)}`)
  } finally {
    isLoading.value = false
    await scrollToBottom()
    await focusInput()
  }
}
</script>

<style scoped>
.chatbot-container,
.chatbot-container * {
  box-sizing: border-box;
}

.chatbot-container {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 10000;
  font-family: inherit;
}

.chatbot-panel {
  position: absolute;
  right: 0;
  bottom: 76px;
  display: flex;
  width: 390px;
  height: 600px;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - 120px);
  overflow: hidden;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #dbe3ec;
  border-radius: 18px;
  box-shadow:
    0 18px 48px
    rgba(15, 23, 42, 0.22);
  color: #1f2937;
}

.chatbot-header {
  display: flex;
  min-height: 76px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  background: #2563eb;
  color: #ffffff;
}

.chatbot-header-text {
  min-width: 0;
}

.chatbot-title {
  margin: 0;
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}

.chatbot-status {
  margin: 4px 0 0;
  color: #dbeafe;
  font-size: 13px;
  line-height: 1.4;
}

.chatbot-close-button {
  display: inline-flex;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 50%;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 28px;
  line-height: 1;
}

.chatbot-close-button:hover {
  background:
    rgba(255, 255, 255, 0.18);
}

.chatbot-close-button:focus-visible {
  outline:
    3px solid
    rgba(255, 255, 255, 0.8);
  outline-offset: 2px;
}

.chatbot-message-area {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 18px 14px 28px;
  background: #f8fafc;
  scrollbar-color:
    #cbd5e1 transparent;
  scrollbar-width: thin;
  overscroll-behavior: contain;
}

.chatbot-message-row {
  display: flex;
  width: 100%;
  flex: 0 0 auto;
}

.chatbot-message-row--bot {
  justify-content: flex-start;
}

.chatbot-message-row--user {
  justify-content: flex-end;
}

.chatbot-message-bubble {
  display: inline-block;
  width: auto;
  max-width: 96%;
  padding: 12px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.7;
  overflow-wrap: anywhere;
  word-break: keep-all;
  white-space: pre-wrap;
}

.chatbot-message-bubble--bot {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-bottom-left-radius: 5px;
  color: #1f2937;
  box-shadow:
    0 2px 8px
    rgba(15, 23, 42, 0.05);
}

.chatbot-message-bubble--user {
  background: #2563eb;
  border-bottom-right-radius: 5px;
  color: #ffffff;
}

.chatbot-loading-bubble {
  display: flex;
  min-width: 58px;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.chatbot-loading-dot {
  width: 7px;
  height: 7px;
  background: #64748b;
  border-radius: 50%;
  animation:
    chatbot-loading
    1.2s infinite ease-in-out;
}

.chatbot-loading-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.chatbot-loading-dot:nth-child(3) {
  animation-delay: 0.3s;
}

.chatbot-example-area {
  flex: 0 0 auto;
  padding: 10px 13px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.chatbot-example-title {
  margin: 0 0 7px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.chatbot-example-buttons {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.chatbot-example-button {
  flex: 0 0 auto;
  padding: 6px 9px;
  background: #ffffff;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  color: #1d4ed8;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
}

.chatbot-example-button:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #60a5fa;
}

.chatbot-example-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.chatbot-source {
  flex: 0 0 auto;
  margin: 0;
  padding: 7px 13px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 10px;
  line-height: 1.4;
  text-align: center;
}

.chatbot-input-area {
  display: flex;
  min-height: 70px;
  flex: 0 0 auto;
  gap: 9px;
  padding: 13px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.chatbot-input {
  min-width: 0;
  flex: 1;
  padding: 11px 12px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  color: #111827;
  font: inherit;
  font-size: 14px;
  outline: none;
}

.chatbot-input::placeholder {
  color: #94a3b8;
}

.chatbot-input:focus {
  border-color: #2563eb;
  box-shadow:
    0 0 0 3px
    rgba(37, 99, 235, 0.16);
}

.chatbot-input:disabled {
  background: #f1f5f9;
  color: #64748b;
  cursor: not-allowed;
}

.chatbot-send-button {
  flex: 0 0 auto;
  padding: 0 16px;
  background: #2563eb;
  border: 1px solid #2563eb;
  border-radius: 10px;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
}

.chatbot-send-button:hover:not(:disabled) {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.chatbot-send-button:disabled {
  background: #94a3b8;
  border-color: #94a3b8;
  cursor: not-allowed;
}

.chatbot-toggle-button {
  display: flex;
  width: 60px;
  height: 60px;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  padding: 0;
  background: #2563eb;
  border: 0;
  border-radius: 50%;
  box-shadow:
    0 10px 28px
    rgba(37, 99, 235, 0.36);
  color: #ffffff;
  cursor: pointer;
  font: inherit;
}

.chatbot-toggle-button:hover {
  background: #1d4ed8;
}

.chatbot-toggle-button:focus-visible {
  outline:
    3px solid
    rgba(37, 99, 235, 0.35);
  outline-offset: 4px;
}

.chatbot-toggle-icon {
  color: #ffffff;
  font-size: 28px;
  line-height: 1;
}

.chatbot-screen-reader-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.chatbot-window-enter-active,
.chatbot-window-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
  transform-origin: right bottom;
}

.chatbot-window-enter-from,
.chatbot-window-leave-to {
  opacity: 0;
  transform:
    translateY(10px)
    scale(0.96);
}

@keyframes chatbot-loading {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-4px);
  }
}

@media (max-width: 480px) {
  .chatbot-container {
    right: 12px;
    bottom: 12px;
  }

  .chatbot-panel {
    position: fixed;
    right: 12px;
    bottom: 80px;
    left: 12px;
    width: calc(100vw - 24px);
    height: 600px;
    max-width: calc(100vw - 24px);
    max-height: calc(100vh - 100px);
  }

  .chatbot-toggle-button {
    width: 56px;
    height: 56px;
  }

  .chatbot-toggle-icon {
    font-size: 26px;
  }

  .chatbot-send-button {
    padding: 0 13px;
  }
}
</style>
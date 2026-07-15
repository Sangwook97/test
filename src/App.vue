<template>
  <div class="app-root">
    <main class="app-main">
      <Home />
      <Chatbot />
    </main>
    <Footer />
  </div>
</template>

<script setup>
import Home from './components/Home.vue'
import Chatbot from './components/chatbot.vue'
import Footer from './components/Footer.vue'
</script>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
}

body {
  margin: 0;
  padding: 0;
  background-color: #f8fafc;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1 0 auto;
  /* 필요시 내부 패딩 추가 */
}
</style>
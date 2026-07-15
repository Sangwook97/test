import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// 1. VCalendar 라이브러리와 스타일 임포트
import VCalendar from 'v-calendar';
import 'v-calendar/style.css';

const app = createApp(App)

// 2. Vue 앱에 등록
app.use(VCalendar, {})
app.mount('#app')

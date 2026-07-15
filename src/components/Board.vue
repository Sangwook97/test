<template>
  <div class="board-container">
    <main class="main-content">
      <div class="slider-wrapper" :class="{ 'slide-active': currentView === 'detail' }">
        <section class="panel list-panel">
          <div class="panel-header">
            <h2>📝 {{ t('board.title') }}</h2>
            <button
              v-if="!isWriting && !isEditing"
              class="btn-primary"
              type="button"
              @click="openWriteForm"
            >
              {{ t('board.write') }}
            </button>
          </div>

          <div v-if="isWriting" class="form-container">
            <h3>{{ t('board.newPost') }}</h3>

            <div v-if="formErrorMsg" class="comment-error-banner">
              ⚠️ {{ formErrorMsg }}
            </div>

            <div class="form-grid">
              <input
                v-model="postForm.author"
                type="text"
                :placeholder="t('board.authorPlaceholder')"
                @input="clearFormError"
              />
              <input
                v-model="postForm.password"
                type="password"
                :placeholder="t('board.passwordPlaceholder')"
                @input="clearFormError"
              />
              <select
                v-model="postForm.region"
                class="dropdown-select-form"
                @change="clearFormError"
              >
                <option value="전체">{{ t('board.all') }}</option>
                <option
                  v-for="region in regions"
                  :key="region"
                  :value="region"
                >
                  {{ displayRegion(region) }}
                </option>
              </select>
            </div>

            <input
              v-model="postForm.title"
              type="text"
              :placeholder="t('board.titlePlaceholder')"
              @input="clearFormError"
            />
            <textarea
              v-model="postForm.content"
              :placeholder="t('board.contentPlaceholder')"
              rows="5"
              @input="clearFormError"
            ></textarea>

            <div class="form-actions">
              <button class="btn-secondary" type="button" @click="closeForm">
                {{ t('board.cancel') }}
              </button>
              <button class="btn-primary" type="button" @click="createPost">
                {{ t('board.publish') }}
              </button>
            </div>
          </div>

          <div v-if="isEditing" class="form-container editing">
            <h3>{{ t('board.editPost') }}</h3>

            <div v-if="formErrorMsg" class="comment-error-banner">
              ⚠️ {{ formErrorMsg }}
            </div>

            <div class="form-grid">
              <span class="editing-info">
                ✍️
                {{
                  t('board.editingInfo', {
                    region: displayRegion(postForm.region),
                    author: postForm.author,
                  })
                }}
              </span>
            </div>

            <input
              v-model="postForm.title"
              type="text"
              :placeholder="t('board.titlePlaceholder')"
              @input="clearFormError"
            />
            <textarea
              v-model="postForm.content"
              :placeholder="t('board.contentPlaceholder')"
              rows="5"
              @input="clearFormError"
            ></textarea>

            <div class="form-actions">
              <button class="btn-secondary" type="button" @click="closeForm">
                {{ t('board.cancel') }}
              </button>
              <button class="btn-success" type="button" @click="updatePost">
                {{ t('board.updateComplete') }}
              </button>
            </div>
          </div>

          <div class="list-scroll-area">
            <div class="control-bar">
              <div class="sort-buttons">
                <button
                  type="button"
                  :class="{ active: sortBy === 'latest' }"
                  @click="sortBy = 'latest'"
                >
                  🕒 {{ t('board.latest') }}
                </button>
                <button
                  type="button"
                  :class="{ active: sortBy === 'likes' }"
                  @click="sortBy = 'likes'"
                >
                  ❤️ {{ t('board.mostLiked') }}
                </button>
              </div>

              <div class="per-page-select">
                <select
                  v-model="itemsPerPage"
                  class="dropdown-large"
                  @change="currentPage = 1"
                >
                  <option :value="10">{{ t('board.perPage', { count: 10 }) }}</option>
                  <option :value="15">{{ t('board.perPage', { count: 15 }) }}</option>
                  <option :value="20">{{ t('board.perPage', { count: 20 }) }}</option>
                </select>
              </div>
            </div>

            <ul class="post-list">
              <li
                v-for="post in paginatedPosts"
                :key="post.id"
                @click="viewPost(post)"
              >
                <div class="post-title-area">
                  <span class="region-tag" :class="'tag-' + post.region">
                    [{{ displayRegion(post.region) }}]
                  </span>
                  <span class="post-title">
                    {{ post.title }}
                    <span
                      v-if="post.comments && post.comments.length > 0"
                      class="comment-count-badge"
                    >
                      [{{ post.comments.length }}]
                    </span>
                  </span>
                </div>
                <span class="post-info">
                  by {{ post.author }} | ❤️ {{ post.likes }} | 👀 {{ post.views || 0 }}
                </span>
              </li>

              <li v-if="filteredPosts.length === 0" class="no-data">
                {{ t('board.noPosts') }}
              </li>
            </ul>

            <div v-if="totalPages > 1" class="pagination">
              <span
                v-for="page in totalPages"
                :key="page"
                class="page-number"
                :class="{ active: currentPage === page }"
                @click="currentPage = page"
              >
                {{ page }}
              </span>
            </div>
          </div>

          <div class="fixed-bottom-bar">
            <select
              v-model="selectedRegion"
              class="dropdown-select-bottom"
              @change="currentPage = 1"
            >
              <option value="전체">{{ t('board.allRegions') }}</option>
              <option
                v-for="region in regions"
                :key="region"
                :value="region"
              >
                {{ displayRegion(region) }}
              </option>
            </select>

            <div class="search-input-wrapper">
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="t('board.searchPlaceholder')"
                @input="currentPage = 1"
              />
            </div>
          </div>
        </section>

        <section v-if="selectedPost" class="panel detail-panel">
          <div class="panel-header">
            <button class="btn-back" type="button" @click="goBackToList">
              ⬅️ {{ t('board.back') }}
            </button>

            <div class="detail-actions">
              <button class="btn-edit" type="button" @click="openAuthModal('edit')">
                {{ t('board.edit') }}
              </button>
              <button class="btn-delete" type="button" @click="openAuthModal('delete')">
                {{ t('board.delete') }}
              </button>
            </div>
          </div>

          <article class="post-body">
            <h1>
              <span class="region-tag-detail">
                [{{ displayRegion(selectedPost.region) }}]
              </span>
              {{ selectedPost.title }}
            </h1>

            <div class="post-meta">
              <span>{{ t('board.author') }}: {{ selectedPost.author }}</span>
              <span class="meta-views">
                👀 {{ t('board.views') }}: {{ selectedPost.views || 0 }}
              </span>
            </div>

            <p class="post-text">{{ selectedPost.content }}</p>

            <div class="feedback-actions">
              <button
                type="button"
                :class="{ active: selectedPost.userReaction === 'like' }"
                @click="toggleReaction('like')"
              >
                👍 {{ t('board.like') }} ({{ selectedPost.likes }})
              </button>
              <button
                type="button"
                :class="{ active: selectedPost.userReaction === 'dislike' }"
                @click="toggleReaction('dislike')"
              >
                👎 {{ t('board.dislike') }} ({{ selectedPost.dislikes }})
              </button>
            </div>
          </article>

          <section class="comment-section">
            <h3>
              💬 {{ t('board.comments') }}
              ({{ selectedPost.comments ? selectedPost.comments.length : 0 }})
            </h3>

            <div v-if="commentErrorMsg" class="comment-error-banner">
              ⚠️ {{ commentErrorMsg }}
            </div>

            <div class="comment-form">
              <input
                v-model="newComment.author"
                type="text"
                :placeholder="t('board.namePlaceholder')"
                @input="clearCommentError"
              />
              <input
                v-model="newComment.text"
                type="text"
                :placeholder="t('board.commentPlaceholder')"
                @keyup.enter="addComment"
                @input="clearCommentError"
              />
              <button type="button" @click="addComment">
                {{ t('board.submit') }}
              </button>
            </div>

            <ul class="comment-list">
              <li v-for="(comment, index) in reversedComments" :key="index">
                <strong>{{ comment.author }}</strong>: {{ comment.text }}
              </li>
              <li
                v-if="!selectedPost.comments || selectedPost.comments.length === 0"
                class="no-data"
              >
                {{ t('board.firstComment') }}
              </li>
            </ul>
          </section>
        </section>
      </div>
    </main>

    <div v-if="showAuthModal" class="custom-modal-backdrop">
      <div class="custom-modal">
        <h3>🔒 {{ t('board.authTitle') }}</h3>
        <p class="modal-desc">
          {{
            authMode === 'edit'
              ? t('board.authEditDescription')
              : t('board.authDeleteDescription')
          }}
        </p>

        <input
          ref="authInputRef"
          v-model="authPassword"
          type="password"
          :placeholder="t('board.passwordInput')"
          class="modal-input"
          @keyup.enter="submitAuth"
        />

        <p v-if="authErrorMsg" class="modal-error-text">
          ❌ {{ authErrorMsg }}
        </p>

        <div class="modal-actions">
          <button class="btn-modal-close" type="button" @click="closeAuthModal">
            {{ t('board.cancel') }}
          </button>
          <button class="btn-modal-confirm" type="button" @click="submitAuth">
            {{ t('board.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useI18n } from '../i18n'

const { locale, t } = useI18n()

const regions = ref(['서울 동부', '서울 서부', '서울 남부', '서울 북부'])

const REGION_LABELS = {
  전체: { ko: '전체', en: 'All' },
  '서울 전체': { ko: '서울 전체', en: 'All Seoul' },
  '서울 동부': { ko: '서울 동부', en: 'East Seoul' },
  '서울 서부': { ko: '서울 서부', en: 'West Seoul' },
  '서울 남부': { ko: '서울 남부', en: 'South Seoul' },
  '서울 북부': { ko: '서울 북부', en: 'North Seoul' },
  서울: { ko: '서울', en: 'Seoul' },
  부산: { ko: '부산', en: 'Busan' },
  광주: { ko: '광주', en: 'Gwangju' },
}

function displayRegion(region) {
  return REGION_LABELS[region]?.[locale.value] || region
}
const selectedRegion = ref('전체')

const currentView = ref('list')
const selectedPost = ref(null)
const searchQuery = ref('')

const sortBy = ref('latest')
const currentPage = ref(1)
const itemsPerPage = ref(10)

const isWriting = ref(false)
const isEditing = ref(false)

const postForm = ref({ id: null, region: '서울 전체', title: '', author: '', password: '', content: '' })
const newComment = ref({ author: '', text: '' })
const posts = ref([])
const formErrorMsg = ref('')

// 🔒 마스터 관리자 비밀번호
const MASTER_PASSWORD = '980707'

/* 🛠️ 모달 & 알림 제어용 새로운 상태값들 */
const showAuthModal = ref(false)
const authMode = ref('') // 'edit' or 'delete'
const authPassword = ref('')
const authErrorMsg = ref('')
const authInputRef = ref(null)
const commentErrorMsg = ref('') // 댓글 검증용 에러 바

onMounted(() => {
  const localData = localStorage.getItem('local_board_posts')
  if (localData) {
    posts.value = JSON.parse(localData)
  } else {
    const defaultPosts = []
    for (let i = 1; i <= 15; i++) {
      defaultPosts.push({
        id: Date.now() + i,
        region: i % 3 === 0 ? '서울' : (i % 3 === 1 ? '부산' : '광주'),
        title: `테스트용 익명 게시글 ${i}번`,
        author: `주니어_${i}`,
        password: '1234',
        content: `본문 내용입니다. 테스트용 데이터 ${i}`,
        likes: i * 2,
        dislikes: 0,
        views: Math.floor(Math.random() * 50) + 10,
        userReaction: null,
        comments: [
          { author: '선배', text: '여기가 그 유명한 로컬 커뮤니티인가요?' },
          { author: '작성자', text: '네, 맞습니다! 환영해요.' }
        ]
      })
    }
    posts.value = defaultPosts.reverse()
    saveToStorage()
  }
})

const saveToStorage = () => {
  localStorage.setItem('local_board_posts', JSON.stringify(posts.value))
}

const filteredPosts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  const result = posts.value.filter((post) => {
    const matchRegion =
      selectedRegion.value === '전체' || post.region === selectedRegion.value

    const matchTitle = (post.title || '').toLowerCase().includes(query)
    const matchAuthor = (post.author || '').toLowerCase().includes(query)

    return matchRegion && (matchTitle || matchAuthor)
  })

  const sorted = [...result]

  if (sortBy.value === 'latest') {
    sorted.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
  } else if (sortBy.value === 'likes') {
    sorted.sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))
  }

  return sorted
})

watch(sortBy, () => {
  currentPage.value = 1
})

const paginatedPosts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredPosts.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredPosts.value.length / itemsPerPage.value)
})

const reversedComments = computed(() => {
  if (!selectedPost.value || !selectedPost.value.comments) return []
  return [...selectedPost.value.comments].reverse()
})

const openWriteForm = () => {
  isWriting.value = true
  isEditing.value = false
  formErrorMsg.value = ''
  postForm.value = {
    id: null,
    region: selectedRegion.value === '전체' ? '전체' : selectedRegion.value,
    title: '',
    author: '',
    password: '',
    content: ''
  }
}

const closeForm = () => {
  isWriting.value = false
  isEditing.value = false
  formErrorMsg.value = ''
}

const createPost = () => {
  const { region, title, author, password, content } = postForm.value

  if (!title || !author || !password || !content) {
    formErrorMsg.value = t('board.formRequired')
    return
  }

  formErrorMsg.value = ''

  posts.value.unshift({
    id: Date.now(),
    region,
    title,
    author,
    password,
    content,
    likes: 0,
    dislikes: 0,
    views: 0,
    userReaction: null,
    comments: []
  })

  saveToStorage()
  closeForm()
  currentPage.value = 1
}

const viewPost = (post) => {
  const target = posts.value.find(p => p.id === post.id)
  if (target) {
    if (target.views === undefined) target.views = 0
    target.views++
    saveToStorage()
  }

  selectedPost.value = target
  currentView.value = 'detail'
}

const goBackToList = () => {
  currentView.value = 'list'
  if (selectedPost.value) {
    const updated = posts.value.find(p => p.id === selectedPost.value.id)
    if (updated) selectedPost.value = updated
  }
}

/* 🔐 모달창 열기 함수 (수정 / 삭제 통합) */
const openAuthModal = (mode) => {
  authMode.value = mode
  authPassword.value = ''
  authErrorMsg.value = ''
  showAuthModal.value = true
  
  // 모달 열릴 때 패스워드 인풋으로 바로 포커스 가도록 제어
  nextTick(() => {
    authInputRef.value?.focus()
  })
}

const closeAuthModal = () => {
  showAuthModal.value = false
  authPassword.value = ''
  authErrorMsg.value = ''
}

/* 🔐 비밀번호 검증 실행 (prompt 대체) */
const submitAuth = () => {
  if (!selectedPost.value) return

  const inputPw = authPassword.value.trim()
  if (!inputPw) {
    authErrorMsg.value = t('board.passwordRequired')
    return
  }

  // 1. [수정] 모드 처리
  if (authMode.value === 'edit') {
    if (inputPw === selectedPost.value.password) {
      // 인증 성공
      closeAuthModal()
      isEditing.value = true
      isWriting.value = false
      
      postForm.value = { 
        id: selectedPost.value.id, 
        region: selectedPost.value.region,
        author: selectedPost.value.author,
        title: selectedPost.value.title, 
        content: selectedPost.value.content 
      }
      goBackToList()
    } else {
      authErrorMsg.value = t('board.passwordMismatch')
    }
  } 
  // 2. [삭제] 모드 처리 (마스터 비밀번호 포함)
  else if (authMode.value === 'delete') {
    if (inputPw === MASTER_PASSWORD) {
      posts.value = posts.value.filter(p => p.id !== selectedPost.value.id)
      saveToStorage()
      selectedPost.value = null
      closeAuthModal()
      goBackToList()
      // 임시배너 등을 쓸 수 있지만 편의상 이 시점은 동작 종료이므로 단순 처리
      alert(t('board.masterDeleted'))
    } else if (inputPw === selectedPost.value.password) {
      posts.value = posts.value.filter(p => p.id !== selectedPost.value.id)
      saveToStorage()
      selectedPost.value = null
      closeAuthModal()
      goBackToList()
      alert(t('board.deleted'))
    } else {
      authErrorMsg.value = t('board.passwordMismatch')
    }
  }
}

const updatePost = () => {
  const target = posts.value.find(p => p.id === postForm.value.id)
  const title = (postForm.value.title || '').trim()
  const content = (postForm.value.content || '').trim()

  if (!title || !content) {
    formErrorMsg.value = t('board.editRequired')
    return
  }

  if (target) {
    target.title = title
    target.content = content
    saveToStorage()

    if (selectedPost.value && selectedPost.value.id === target.id) {
      selectedPost.value = { ...target }
    }

    formErrorMsg.value = ''
  }

  closeForm()
}

const toggleReaction = (type) => {
  const post = posts.value.find(p => p.id === selectedPost.value.id)
  if (!post) return
  if (post.userReaction === type) {
    post.userReaction = null; type === 'like' ? post.likes-- : post.dislikes--
  } else {
    if (post.userReaction === 'like') post.likes--
    if (post.userReaction === 'dislike') post.dislikes--
    post.userReaction = type; type === 'like' ? post.likes++ : post.dislikes++
  }
  saveToStorage()
}

const clearFormError = () => {
  formErrorMsg.value = ''
}

/* 💬 댓글 에러 배너 초기화 함수 */
const clearCommentError = () => {
  commentErrorMsg.value = ''
}

/* 💬 댓글 입력 함수 (alert 전면 걷어냄 -> 화면 굳음 현상 완전 해결!) */
const addComment = () => {
  const authorInput = (newComment.value?.author || '').trim()
  const textInput = (newComment.value?.text || '').trim()

  // 브라우저가 정지되는 alert 대신 내부 Vue 변수(commentErrorMsg)에 경고문 기록
  if (!authorInput) {
    commentErrorMsg.value = t('board.commentAuthorRequired')
    return
  }
  if (!textInput) {
    commentErrorMsg.value = t('board.commentRequired')
    return
  }

  // 정상 입력 확인 시 경고창 제거
  commentErrorMsg.value = ''

  const post = posts.value.find(p => p.id === selectedPost.value.id)
  if (post) {
    if (!post.comments) {
      post.comments = []
    }
    
    post.comments.push({ 
      author: authorInput, 
      text: textInput 
    })
    saveToStorage()
  }

  // 입력창 초기화
  newComment.value.text = ''
}
</script>

<style scoped>
/* 기존 스타일은 모두 그대로 유지하면서 모달 스타일 & 댓글 배너 스타일 추가 */
.board-container { width: 100%; height: 100%; font-family: sans-serif; overflow: hidden; background: #fff; position: relative; }
.main-content { width: 100%; height: 100%; overflow: hidden; position: relative; }
.slider-wrapper { display: flex; width: 200%; height: 100%; transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1); }
.slide-active { transform: translateX(-50%); }

.panel { width: 50%; height: 100%; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #edf2f7; padding-bottom: 10px; flex-shrink: 0; }
.panel-header h2 { margin: 0; font-size: 1.3rem; }

.list-scroll-area { flex: 1; overflow-y: auto; padding-bottom: 20px; }

.control-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
.sort-buttons { display: flex; gap: 8px; }
.sort-buttons button { background: #f7fafc; border: 1px solid #cbd5e0; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; }
.sort-buttons button.active { background: #3182ce; color: white; border-color: #3182ce; font-weight: bold; }

.dropdown-large { 
  padding: 8px 16px; 
  border: 2px solid #cbd5e0; 
  border-radius: 8px; 
  font-size: 1rem; 
  font-weight: bold;
  background-color: #fff; 
  cursor: pointer; 
  outline: none;
  transition: border-color 0.2s;
}
.dropdown-large:focus {
  border-color: #3182ce;
}

.post-title-area { display: flex; align-items: center; gap: 8px; }
.comment-count-badge { color: #e53e3e; font-weight: bold; font-size: 0.9rem; margin-left: 4px; }

.region-tag { display: inline-block; font-size: 0.8rem; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: #edf2f7; color: #4a5568; flex-shrink: 0;}
.region-tag.tag-전체 { background: #e2e8f0; color: #4a5568; }
.region-tag.tag-서울 { background: #ebf8ff; color: #2b6cb0; }
.region-tag.tag-부산 { background: #f0fff4; color: #22543d; }
.region-tag.tag-대구 { background: #fffaf0; color: #7b341e; }
.region-tag.tag-인천 { background: #faf5ff; color: #553c9a; }
.region-tag.tag-광주 { background: #fff5f5; color: #742a2a; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 15px; margin: 25px 0 10px 0; }
.page-number { cursor: pointer; padding: 2px 8px; font-size: 0.95rem; color: #718096; }
.page-number:not(:last-child)::after { content: "  |"; color: #cbd5e0; margin-left: 15px; }
.page-number.active { color: #3182ce; font-weight: bold; text-decoration: underline; }

.fixed-bottom-bar { display: flex; gap: 10px; padding: 15px 0 5px 0; border-top: 1px solid #edf2f7; background: white; flex-shrink: 0; }
.dropdown-select-bottom { padding: 10px 12px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 0.95rem; background-color: white; cursor: pointer; width: 130px; }
.search-input-wrapper { flex: 1; }
.search-input-wrapper input { width: 100%; padding: 10px 12px; box-sizing: border-box; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 0.95rem; }

.dropdown-select-form { padding: 10px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 0.95rem; background-color: white; width: 100px; }
.form-container { background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; flex-shrink: 0;}
.form-grid { display: flex; gap: 10px; align-items: center; }
.form-grid input { flex: 1; }
.form-container input, .form-container textarea { padding: 10px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 0.95rem; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; }
.editing-info { font-size: 0.9rem; color: #2f855a; font-weight: bold; }

.btn-primary { background: #3182ce; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;}
.btn-secondary { background: #e2e8f0; color: #333; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; }
.btn-success { background: #38a169; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;}
.btn-back { background: transparent; border: 1px solid #ccc; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
.detail-actions { display: flex; gap: 8px; }
.btn-edit { background: #e2e8f0; color: #4a5568; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
.btn-delete { background: #fed7d7; color: #c53030; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }

.post-list { list-style: none; padding: 0; margin: 0; }
.post-list li { padding: 14px 10px; border-bottom: 1px solid #edf2f7; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
.post-list li:hover { background: #f7fafc; }
.post-title { font-weight: 600; color: #2d3748; }
.post-info { color: #718096; font-size: 0.85rem; flex-shrink: 0; }

.post-body { border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
.region-tag-detail { background: #3182ce; color: white; font-size: 0.9rem; padding: 2px 6px; border-radius: 4px; margin-right: 8px; }
.post-meta { display: flex; gap: 15px; color: #718096; margin-bottom: 20px; font-size: 0.9rem; }
.meta-views { font-weight: 500; color: #4a5568; }
.post-text { line-height: 1.6; white-space: pre-wrap; color: #2d3748; }
.feedback-actions { display: flex; gap: 15px; margin-top: 20px; }
.feedback-actions button { padding: 8px 16px; border: 1px solid #cbd5e0; border-radius: 20px; background: white; cursor: pointer; }
.feedback-actions button.active { background: #ebf8ff; border-color: #3182ce; color: #2b6cb0; font-weight: bold; }

.comment-section { margin-top: 30px; }
.comment-form { display: flex; gap: 10px; margin-bottom: 20px; }
.comment-form input[type="text"]:nth-child(1) { width: 100px; }
.comment-form input[type="text"]:nth-child(2) { flex: 1; }
.comment-form input, .comment-form button { padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px; }
.comment-form button { background: #4a5568; color: white; border: none; cursor: pointer; width: 60px; }
.comment-list { list-style: none; padding: 0; }
.comment-list li { padding: 10px 0; border-bottom: 1px dashed #e2e8f0; font-size: 0.95rem; }
.no-data { text-align: center; color: #a0aec0; padding: 30px 0; list-style: none; }

/* 💬 댓글 인라인 에러 알림바 스타일 */
.comment-error-banner {
  background: #fff5f5;
  color: #c53030;
  border: 1px solid #fed7d7;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 0.9rem;
  font-weight: bold;
}

/* 🔒 보안을 위해 커스텀으로 만든 예쁜 비밀번호 인증 모달 창 CSS */
.custom-modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5); /* 어두운 뒷배경 처리 */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999; /* 화면 최상단 고정 */
}

.custom-modal {
  background: white;
  width: 380px;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  text-align: center;
  animation: modalScaleUp 0.15s ease-out;
}

.custom-modal h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 1.2rem;
  color: #2d3748;
}

.modal-desc {
  font-size: 0.9rem;
  color: #718096;
  margin-bottom: 18px;
  line-height: 1.4;
}

.modal-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  text-align: center;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s;
  margin-bottom: 10px;
}

.modal-input:focus {
  border-color: #3182ce;
}

.modal-error-text {
  color: #e53e3e;
  font-size: 0.85rem;
  margin: 5px 0 15px 0;
  font-weight: bold;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.btn-modal-close {
  flex: 1;
  background: #edf2f7;
  color: #4a5568;
  border: none;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.btn-modal-confirm {
  flex: 1;
  background: #3182ce;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

@keyframes modalScaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
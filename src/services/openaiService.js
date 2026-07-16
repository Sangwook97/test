const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-5-mini'
const OPENAI_API_URL = 'https://api.openai.com/v1/responses'

const DATASETS = [
  {
    type: '관광지',
    label: { ko: '관광지', en: 'tourist attractions' },
    file: '서울_관광지.json',
  },
  {
    type: '문화시설',
    label: { ko: '문화시설', en: 'cultural facilities' },
    file: '서울_문화시설.json',
  },
  {
    type: '축제공연행사',
    label: { ko: '축제·공연·행사', en: 'festivals and events' },
    file: '서울_축제공연행사.json',
  },
  {
    type: '레포츠',
    label: { ko: '레포츠', en: 'leisure activities' },
    file: '서울_레포츠.json',
  },
  {
    type: '쇼핑',
    label: { ko: '쇼핑', en: 'shopping places' },
    file: '서울_쇼핑.json',
  },
  {
    type: '숙박',
    label: { ko: '숙박', en: 'accommodation' },
    file: '서울_숙박.json',
  },
  {
    type: '여행코스',
    label: { ko: '여행코스', en: 'travel courses' },
    file: '서울_여행코스.json',
  },
]

const CATEGORY_TYPES = DATASETS.map((dataset) => dataset.type)
const datasetCache = new Map()

/**
 * OpenAI가 사용자 질문을 분석할 때 사용하는 응답 형식입니다.
 *
 * search:
 * LocalHub 데이터에서 장소를 검색할 수 있는 질문
 *
 * unsupported:
 * 실시간 날씨, 혼잡도 등 데이터에 없는 정보가 필요한 질문
 *
 * clarify:
 * 장소를 찾는 질문이지만 조건이 너무 모호한 질문
 */
const QUESTION_ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,

  properties: {
    action: {
      type: 'string',
      enum: ['search', 'unsupported', 'clarify'],
    },

    categories: {
      type: 'array',
      items: {
        type: 'string',
        enum: CATEGORY_TYPES,
      },
    },

    district: {
      type: 'string',
    },

    search_terms: {
      type: 'array',
      items: {
        type: 'string',
      },
    },

    date_start: {
      type: 'string',
    },

    date_end: {
      type: 'string',
    },

    limitation: {
      type: 'string',
    },

    answer: {
      type: 'string',
    },
  },

  required: [
    'action',
    'categories',
    'district',
    'search_terms',
    'date_start',
    'date_end',
    'limitation',
    'answer',
  ],
}

/**
 * JSON 후보를 전달한 뒤 OpenAI가 최종 답변을 작성할 때
 * 사용하는 응답 형식입니다.
 */
const FINAL_ANSWER_SCHEMA = {
  type: 'object',
  additionalProperties: false,

  properties: {
    status: {
      type: 'string',
      enum: ['recommendation', 'no_match'],
    },

    selected_names: {
      type: 'array',
      items: {
        type: 'string',
      },
    },

    answer: {
      type: 'string',
    },
  },

  required: ['status', 'selected_names', 'answer'],
}

function normalizeLanguage(language) {
  return language === 'en' ? 'en' : 'ko'
}

function textByLanguage(language, koreanText, englishText) {
  return normalizeLanguage(language) === 'en' ? englishText : koreanText
}

/**
 * OpenAI가 "오늘", "이번 주"와 같은 표현을 정확히 해석할 수 있도록
 * 현재 날짜를 YYYY-MM-DD 형식으로 반환합니다.
 */
function todayText() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * YYYY-MM-DD, YYYY.MM.DD, YYYYMMDD 등으로 들어온 날짜를
 * YYYYMMDD 형식으로 통일합니다.
 */
function normalizeDate(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '')

  return /^\d{8}$/.test(digits) ? digits : ''
}

/**
 * 장소의 주소를 생성합니다.
 */
function createAddress(item, category, language) {
  const address = [item?.addr1, item?.addr2]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim())
    .join(' ')
    .trim()

  if (address) {
    return address
  }

  /*
   * 여행코스 데이터는 일부 항목에 상세 주소가 없을 수 있습니다.
   */
  if (category === '여행코스') {
    return textByLanguage(
      language,
      '서울특별시 (세부 주소 정보 없음)',
      'Seoul (detailed address unavailable)',
    )
  }

  return ''
}

/**
 * JSON 항목에서 검색에 사용할 문자열을 하나로 합칩니다.
 */
function createSearchableText(item, category) {
  return [
    category,
    item?.title,
    item?.addr1,
    item?.addr2,
    item?.tel,
    item?.eventplace,
    item?.program,
    item?.subevent,
    item?.sponsor1,
    item?.playtime,
    item?.usetimefestival,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/**
 * OpenAI에 전달할 데이터 형태로 JSON 항목을 정리합니다.
 */
function normalizeItem(item, category, language) {
  const normalizedItem = {
    category,
    name: String(item?.title || '').trim(),
    location: createAddress(item, category, language),
    telephone: String(item?.tel || '').trim(),
  }

  if (category === '축제공연행사') {
    return {
      ...normalizedItem,
      event_start_date: String(item?.eventstartdate || ''),
      event_end_date: String(item?.eventenddate || ''),
      event_place: String(item?.eventplace || ''),
      play_time: String(item?.playtime || ''),
      program: String(item?.program || '').slice(0, 700),
      fee: String(item?.usetimefestival || ''),
    }
  }

  return normalizedItem
}

/**
 * public/data 폴더에 있는 JSON 파일을 불러옵니다.
 * 한 번 불러온 데이터는 Map에 저장해 다시 요청하지 않습니다.
 */
async function loadDataset(dataset, language) {
  if (datasetCache.has(dataset.file)) {
    return datasetCache.get(dataset.file)
  }

  const response = await fetch(`/data/${dataset.file}`)

  if (!response.ok) {
    throw new Error(
      textByLanguage(
        language,
        `${dataset.file} 파일을 불러오지 못했습니다. 상태 코드: ${response.status}`,
        `${dataset.file} could not be loaded. Status: ${response.status}`,
      ),
    )
  }

  const data = await response.json()

  if (!data || !Array.isArray(data.items)) {
    throw new Error(
      textByLanguage(
        language,
        `${dataset.file}에서 items 배열을 찾지 못했습니다.`,
        `The items array was not found in ${dataset.file}.`,
      ),
    )
  }

  const loadedDataset = {
    type: data.contentType || dataset.type,
    items: data.items,
  }

  datasetCache.set(dataset.file, loadedDataset)

  return loadedDataset
}

/**
 * OpenAI Responses API 응답에서 텍스트를 추출합니다.
 */
function extractOutputText(responseData) {
  if (
    typeof responseData?.output_text === 'string' &&
    responseData.output_text.trim()
  ) {
    return responseData.output_text.trim()
  }

  if (!Array.isArray(responseData?.output)) {
    return ''
  }

  const textParts = []

  for (const outputItem of responseData.output) {
    if (!Array.isArray(outputItem?.content)) {
      continue
    }

    for (const contentItem of outputItem.content) {
      if (
        contentItem?.type === 'output_text' &&
        typeof contentItem.text === 'string'
      ) {
        textParts.push(contentItem.text)
      }
    }
  }

  return textParts.join('\n').trim()
}

/**
 * OpenAI가 요청을 거부한 경우 거부 메시지를 추출합니다.
 */
function extractRefusal(responseData) {
  if (!Array.isArray(responseData?.output)) {
    return ''
  }

  for (const outputItem of responseData.output) {
    if (!Array.isArray(outputItem?.content)) {
      continue
    }

    for (const contentItem of outputItem.content) {
      if (
        contentItem?.type === 'refusal' &&
        typeof contentItem.refusal === 'string'
      ) {
        return contentItem.refusal.trim()
      }
    }
  }

  return ''
}

/**
 * OpenAI Responses API에 요청하고
 * JSON Schema 형식의 구조화된 응답을 반환합니다.
 */
async function requestStructuredOutput({
  instructions,
  input,
  schemaName,
  schema,
  maxOutputTokens = 1000,
  language,
}) {
  if (!OPENAI_API_KEY) {
    throw new Error(
      textByLanguage(
        language,
        'OpenAI API 키가 없습니다. 프로젝트 루트의 .env 파일을 확인해 주세요.',
        'The OpenAI API key is missing. Check the project root .env file.',
      ),
    )
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },

    body: JSON.stringify({
      model: OPENAI_MODEL,

      instructions,

      input,

      text: {
        format: {
          type: 'json_schema',
          name: schemaName,
          strict: true,
          schema,
        },
      },

      max_output_tokens: maxOutputTokens,
      store: false,
    }),
  })

  if (!response.ok) {
    let errorMessage = textByLanguage(
      language,
      `OpenAI API 요청에 실패했습니다. 상태 코드: ${response.status}`,
      `The OpenAI API request failed. Status: ${response.status}`,
    )

    try {
      const errorData = await response.json()
      errorMessage = errorData?.error?.message || errorMessage
    } catch {
      /*
       * JSON 형식이 아닌 오류 응답이면 기본 메시지를 사용합니다.
       */
    }

    throw new Error(errorMessage)
  }

  const responseData = await response.json()
  const refusal = extractRefusal(responseData)

  if (refusal) {
    throw new Error(refusal)
  }

  const outputText = extractOutputText(responseData)

  if (!outputText) {
    const incompleteReason = responseData?.incomplete_details?.reason

    if (incompleteReason) {
      throw new Error(
        textByLanguage(
          language,
          `OpenAI 응답이 완료되지 않았습니다. 사유: ${incompleteReason}`,
          `The OpenAI response was incomplete. Reason: ${incompleteReason}`,
        ),
      )
    }

    throw new Error(
      textByLanguage(
        language,
        'OpenAI 응답에서 내용을 찾지 못했습니다.',
        'No content was found in the OpenAI response.',
      ),
    )
  }

  try {
    return JSON.parse(outputText)
  } catch {
    throw new Error(
      textByLanguage(
        language,
        'OpenAI의 구조화된 응답을 해석하지 못했습니다.',
        'The structured OpenAI response could not be parsed.',
      ),
    )
  }
}

/**
 * 첫 번째 OpenAI 호출에 전달할 자연어 분석 지침입니다.
 *
 * 여기에서 사용자의 질문을 다음 세 가지로 분류합니다.
 *
 * search
 * unsupported
 * clarify
 */
function createAnalysisInstructions(language) {
  const categoryDescription = DATASETS.map((dataset) => {
    return `- ${dataset.type}: ${dataset.label[normalizeLanguage(language)]}`
  }).join('\n')

  if (normalizeLanguage(language) === 'en') {
    return `
You are the natural-language request router for the LocalHub Seoul information chatbot.

Do not use simple keyword matching.
Understand the full meaning and context of the user's sentence and decide whether the supplied LocalHub JSON data can answer it.

Current date: ${todayText()}

Available categories:
${categoryDescription}

Available data fields:
- All categories: place name, category, Seoul address, and sometimes telephone.
- Festivals and events only: start date, end date, venue, play time, program text, and fee text.

Unavailable data:
- Live weather, temperature, precipitation forecast, and air quality
- Live crowd levels, visitor counts, waiting times, and traffic
- Current opening status or business hours unless explicitly present in a supplied record
- Reservations, vacancies, live prices, and tickets remaining
- Reviews, ratings, popularity rankings, and verified suitability
- Restaurants and food-place data
- General news, finance, translation, calculations, and programming help

Return action="search" when the user wants a Seoul place and the request can be answered or cautiously approximated from the available fields.

Examples:

- "I want somewhere lively"
  -> search
  Choose attractions, shopping, and festivals.
  State in limitation that live crowd data is unavailable and the request is being interpreted as an atmosphere preference.

- "Indoor places for a rainy day"
  -> search
  Choose cultural facilities and shopping.
  Do not claim to know the actual weather.

- "A place for children"
  -> search
  Use likely title and category clues cautiously.
  Add a limitation that verified suitability for children is unavailable.

- "Accommodation in Gangnam-gu"
  -> search
  Select accommodation and district 강남구.

- "Festivals this week"
  -> search
  Select festivals.
  Convert the requested period to YYYYMMDD date_start and date_end using the current date.

Return action="unsupported" when answering requires unavailable facts.

Examples:

- "What is the weather today?"
- "Where is crowded right now?"
- "Which hotel has a vacancy tonight?"
- "Which attraction has parking?" when parking information is unavailable

For unsupported questions:
- Write a natural and helpful answer in the user's language.
- Briefly explain which information is missing.
- Suggest one related question that LocalHub can answer.

Return action="clarify" only when the user appears to be looking for a LocalHub place but the request is too ambiguous to search.

For clarify:
- Ask one short and natural clarification question.

For action="search":

- categories must contain one or more available category values.
- district must be an exact Korean Seoul district name ending in 구, or an empty string.
- search_terms must be short Korean terms likely to appear in a place name, address, festival venue, or festival details.
- Translate English concepts into useful Korean search terms.
- date_start and date_end must use YYYYMMDD or be empty strings.
- limitation must contain a natural caveat when the user's condition cannot be verified directly.
- answer must be an empty string.

For action="unsupported" or action="clarify":

- categories and search_terms must be empty arrays.
- district, date_start, date_end, and limitation must be empty strings.
- answer must contain the final natural response to show directly to the user.
`.trim()
  }

  return `
당신은 LocalHub 서울 지역정보 챗봇의 자연어 요청 분석기입니다.

특정 단어의 포함 여부만으로 질문을 판단하지 마세요.
사용자가 작성한 문장 전체의 의미와 문맥을 이해하여 LocalHub JSON 데이터로 답변할 수 있는지 판단하세요.

오늘 날짜: ${todayText()}

사용 가능한 카테고리:
${categoryDescription}

LocalHub 데이터에 들어 있는 정보:

- 모든 카테고리:
  장소명, 카테고리, 서울 주소, 일부 전화번호

- 축제·공연·행사:
  시작일, 종료일, 행사 장소, 공연 시간, 프로그램 설명, 요금 문구

LocalHub 데이터에 없는 정보:

- 실시간 날씨
- 현재 기온
- 강수 예보
- 미세먼지와 대기질
- 실시간 혼잡도
- 현재 방문객 수
- 대기시간
- 교통 상황
- 현재 영업 여부
- JSON에 명시되지 않은 운영시간
- 예약 가능 여부
- 숙소 빈방
- 실시간 가격
- 남은 티켓 수
- 후기
- 평점
- 실제 인기 순위
- 검증된 가족·아동·반려동물 적합성
- 음식점과 맛집 정보
- 일반 뉴스
- 금융
- 번역
- 계산
- 코딩과 프로그래밍

사용자가 서울의 장소를 찾고 있고, LocalHub가 보유한 데이터로 답변하거나 조심스럽게 추천할 수 있으면 action="search"로 판단하세요.

예시 1:

사용자:
"사람 많은데 가고 싶어"

판단:
action="search"

관광지, 쇼핑, 축제공연행사를 선택하세요.

이 질문은 현재 실제 혼잡도를 확인해 달라는 요청이 아니라,
활기차거나 북적이는 분위기의 장소를 찾는 요청으로 해석할 수 있습니다.

다만 LocalHub에는 실시간 방문객 수와 혼잡도 정보가 없으므로
limitation에 이 사실을 자연스럽게 작성하세요.

예시 2:

사용자:
"비 오는 날 갈 만한 실내 장소 알려줘"

판단:
action="search"

문화시설과 쇼핑을 선택하세요.

이 질문은 오늘 실제 비가 오는지를 확인하는 질문이 아니라,
비가 오는 상황에 방문할 장소를 추천해 달라는 요청입니다.

실제 현재 날씨를 알고 있다고 말하면 안 됩니다.

예시 3:

사용자:
"아이와 갈 만한 곳 알려줘"

판단:
action="search"

관광지, 문화시설, 레포츠 중 적절한 카테고리를 선택하세요.

장소명과 카테고리에 나타나는 단서를 활용해 조심스럽게 검색하되,
LocalHub 데이터에는 아동 적합성이 검증되어 있지 않다는 내용을
limitation에 자연스럽게 작성하세요.

예시 4:

사용자:
"강남구에서 묵을 곳을 찾고 있어"

판단:
action="search"

categories에는 숙박을 넣고
district에는 강남구를 넣으세요.

예시 5:

사용자:
"이번 주에 하는 축제 알려줘"

판단:
action="search"

categories에는 축제공연행사를 넣으세요.

오늘 날짜를 기준으로 이번 주의 시작일과 종료일을 계산하고
date_start와 date_end를 YYYYMMDD 형식으로 작성하세요.

LocalHub 데이터에 없는 사실을 알아야만 답변할 수 있으면
action="unsupported"로 판단하세요.

예시:

- "오늘 날씨가 어때?"
- "내일 비가 올까?"
- "현재 기온이 몇 도야?"
- "지금 어디가 가장 붐벼?"
- "현재 사람이 많은 관광지 알려줘"
- "지금 문을 연 장소가 어디야?"
- "오늘 빈방이 있는 호텔 알려줘"
- "예약 가능한 숙소 알려줘"
- "현재 입장료가 얼마야?"
- "주차 가능한 관광지 알려줘"
  단, 후보 데이터에 주차 정보가 없는 경우

unsupported로 판단한 경우에는 고정된 안내 문구를 사용하지 마세요.

사용자가 실제로 물어본 내용을 고려해
자연스럽고 친절한 최종 답변을 answer에 작성하세요.

어떤 정보가 LocalHub 데이터에 없어서 답변할 수 없는지 짧게 설명하고,
LocalHub가 대신 답변할 수 있는 관련 질문을 하나 제안하세요.

예시:

사용자:
"오늘 날씨가 어때?"

answer 예시:
"현재 LocalHub에는 실시간 날씨와 기온 정보가 포함되어 있지 않아 오늘 날씨는 확인해 드리기 어려워요. 대신 비 오는 날 방문하기 좋은 실내 문화시설이나 쇼핑 장소를 추천해 드릴 수 있어요."

사용자:
"지금 사람이 가장 많은 곳이 어디야?"

answer 예시:
"LocalHub에는 실시간 방문객 수나 혼잡도 데이터가 없어 현재 가장 사람이 많은 장소는 확인할 수 없어요. 대신 활기찬 분위기의 관광지나 쇼핑 장소를 추천해 드릴 수 있어요."

사용자:
"주차 가능한 관광지 알려줘"

answer 예시:
"현재 LocalHub 데이터에는 장소별 주차 가능 여부가 포함되어 있지 않아 정확히 확인해 드리기 어려워요. 대신 원하는 지역의 관광지를 먼저 추천받은 뒤 해당 장소의 최신 주차 정보를 확인해 주세요."

사용자가 LocalHub 장소를 찾는 것 같지만
검색에 필요한 조건이 지나치게 모호할 때만 action="clarify"를 사용하세요.

clarify를 사용할 때는 딱딱한 오류 문구가 아니라
짧은 확인 질문 하나를 자연스럽게 작성하세요.

예시:

사용자:
"어디 가지?"

answer 예시:
"어떤 분위기의 장소를 찾고 계신가요? 관광지, 실내 문화시설, 쇼핑, 숙박 중 원하는 유형이나 방문할 지역을 알려주세요."

작성 규칙:

action="search"인 경우:

- categories에는 사용 가능한 카테고리를 1개 이상 넣으세요.
- district는 서울의 정확한 한국어 자치구명으로 작성하세요.
- 자치구가 명확하지 않으면 빈 문자열을 사용하세요.
- district 예시: 강남구, 종로구, 마포구
- search_terms는 장소명, 주소, 축제 상세에서 실제로 검색할 수 있는 짧은 한국어 단어를 작성하세요.
- 영어 질문도 search_terms는 한국어 검색어로 변환하세요.
- date_start와 date_end는 YYYYMMDD 형식 또는 빈 문자열입니다.
- 사용자의 조건을 데이터로 직접 검증할 수 없지만 분위기나 목적으로 해석할 수 있으면 limitation에 자연스러운 주의 문구를 작성하세요.
- action="search"일 때 answer는 반드시 빈 문자열입니다.

action="unsupported" 또는 action="clarify"인 경우:

- categories는 빈 배열입니다.
- search_terms는 빈 배열입니다.
- district는 빈 문자열입니다.
- date_start는 빈 문자열입니다.
- date_end는 빈 문자열입니다.
- limitation은 빈 문자열입니다.
- answer에는 사용자에게 바로 보여 줄 자연스러운 최종 답변을 작성하세요.
`.trim()
}

/**
 * 첫 번째 OpenAI 요청입니다.
 *
 * 사용자의 문장을 자연어로 분석해
 * search, unsupported, clarify 중 하나를 결정합니다.
 */
async function analyzeQuestion(question, language) {
  return requestStructuredOutput({
    instructions: createAnalysisInstructions(language),

    input: textByLanguage(
      language,
      `사용자 질문:\n${question}`,
      `User question:\n${question}`,
    ),

    schemaName: 'localhub_question_analysis',
    schema: QUESTION_ANALYSIS_SCHEMA,
    maxOutputTokens: 900,
    language,
  })
}

/**
 * OpenAI가 반환한 분석 결과를 안전한 형태로 정리합니다.
 */
function sanitizeAnalysis(analysis) {
  const action = ['search', 'unsupported', 'clarify'].includes(
    analysis?.action,
  )
    ? analysis.action
    : 'clarify'

  const categories = Array.isArray(analysis?.categories)
    ? [...new Set(analysis.categories)].filter((category) =>
        CATEGORY_TYPES.includes(category),
      )
    : []

  const searchTerms = Array.isArray(analysis?.search_terms)
    ? [...new Set(analysis.search_terms)]
        .map((term) => String(term || '').trim())
        .filter((term) => term.length >= 1)
        .slice(0, 12)
    : []

  return {
    action,
    categories,
    district: String(analysis?.district || '').trim(),
    search_terms: searchTerms,
    date_start: normalizeDate(analysis?.date_start),
    date_end: normalizeDate(analysis?.date_end),
    limitation: String(analysis?.limitation || '').trim(),
    answer: String(analysis?.answer || '').trim(),
  }
}

/**
 * 축제 기간과 사용자가 요청한 기간이 겹치는지 확인합니다.
 */
function festivalOverlaps(item, dateStart, dateEnd) {
  if (!dateStart && !dateEnd) {
    return true
  }

  const itemStart = normalizeDate(item?.eventstartdate)
  const itemEnd = normalizeDate(item?.eventenddate) || itemStart

  const requestedStart = dateStart || dateEnd
  const requestedEnd = dateEnd || dateStart

  if (!itemStart || !itemEnd || !requestedStart || !requestedEnd) {
    return false
  }

  return itemStart <= requestedEnd && itemEnd >= requestedStart
}

/**
 * OpenAI가 추출한 지역, 검색어, 날짜를 이용해
 * 각 JSON 항목의 점수를 계산합니다.
 */
function calculateCandidateScore(item, category, analysis) {
  const searchableText = createSearchableText(item, category)
  const title = String(item?.title || '').toLowerCase()

  let score = 0

  /*
   * 사용자가 특정 자치구를 말한 경우
   * 해당 자치구에 속하지 않는 데이터는 제외합니다.
   */
  if (analysis.district) {
    if (!searchableText.includes(analysis.district.toLowerCase())) {
      return -1
    }

    score += 40
  }

  /*
   * OpenAI가 추출한 자연어 검색어와 JSON 내용을 비교합니다.
   */
  for (const searchTerm of analysis.search_terms) {
    const normalizedTerm = searchTerm.toLowerCase()

    if (searchableText.includes(normalizedTerm)) {
      score += 5
    }

    if (title.includes(normalizedTerm)) {
      score += 12
    }
  }

  /*
   * 축제 질문에 날짜가 포함된 경우 기간이 겹치는 축제만 남깁니다.
   */
  if (category === '축제공연행사') {
    if (!festivalOverlaps(item, analysis.date_start, analysis.date_end)) {
      return -1
    }

    if (analysis.date_start || analysis.date_end) {
      score += 30
    }
  }

  /*
   * 검색 조건과 실제로 일치한 데이터에만 이미지 보너스를 줍니다.
   */
  if (score > 0 && item?.firstimage) {
    score += 1
  }

  return score
}

/**
 * 정확한 검색어가 없는 분위기 추천에서는
 * 데이터의 앞부분만 고정적으로 전달하지 않도록
 * 전체 데이터에서 일정한 간격으로 후보를 선택합니다.
 */
function pickEvenly(items, limit) {
  if (items.length <= limit) {
    return items
  }

  return Array.from({ length: limit }, (_, index) => {
    const position = Math.round(
      (index * (items.length - 1)) / Math.max(1, limit - 1),
    )

    return items[position]
  })
}

/**
 * OpenAI의 자연어 분석 결과를 이용해
 * 실제 LocalHub JSON에서 후보를 찾습니다.
 */
async function getCandidateItems(analysis, language) {
  const targetCategories = analysis.categories.length
    ? analysis.categories
    : CATEGORY_TYPES

  const targetDatasets = targetCategories
    .map((category) => {
      return DATASETS.find((dataset) => dataset.type === category)
    })
    .filter(Boolean)

  const candidateGroups = await Promise.all(
    targetDatasets.map(async (dataset) => {
      const loadedDataset = await loadDataset(dataset, language)

      const scoredItems = loadedDataset.items
        .map((item, index) => ({
          item,
          index,
          score: calculateCandidateScore(item, dataset.type, analysis),
        }))
        .filter(({ item, score }) => {
          return (
            score >= 0 &&
            Boolean(String(item?.title || '').trim()) &&
            Boolean(createAddress(item, dataset.type, language))
          )
        })
        .sort((first, second) => {
          if (second.score !== first.score) {
            return second.score - first.score
          }

          return first.index - second.index
        })

      /*
       * 검색어나 지역, 날짜와 실제로 일치한 데이터입니다.
       */
      const matchedItems = scoredItems.filter(({ score }) => score > 0)

      /*
       * 한 카테고리만 검색할 때는 후보를 조금 더 많이 전달합니다.
       */
      const limit = targetDatasets.length === 1 ? 30 : 8

      /*
       * 검색어가 명확하면 점수가 높은 후보를 사용합니다.
       *
       * "활기찬 곳", "조용한 곳"처럼 JSON에 정확한 단어가 없는
       * 분위기 추천이면 해당 카테고리에서 후보를 균등하게 가져옵니다.
       *
       * 최종 추천 여부는 두 번째 OpenAI 호출에서
       * 데이터에 근거가 있는지 다시 판단합니다.
       */
      const selectedItems = matchedItems.length
        ? matchedItems.slice(0, limit)
        : pickEvenly(scoredItems, limit)

      return selectedItems.map(({ item }) => {
        return normalizeItem(item, dataset.type, language)
      })
    }),
  )

  /*
   * 서로 다른 카테고리에서 같은 장소가 중복될 수 있으므로
   * 장소명을 기준으로 중복을 제거합니다.
   */
  const uniqueCandidates = []
  const usedNames = new Set()

  for (const item of candidateGroups.flat()) {
    const normalizedName = item.name.replace(/\s+/g, ' ').toLowerCase()

    if (!normalizedName || usedNames.has(normalizedName)) {
      continue
    }

    usedNames.add(normalizedName)
    uniqueCandidates.push(item)

    /*
     * OpenAI에 너무 많은 데이터를 전달하지 않도록 제한합니다.
     */
    if (uniqueCandidates.length >= 40) {
      break
    }
  }

  return uniqueCandidates
}

/**
 * 두 번째 OpenAI 호출에 전달할 최종 답변 작성 지침입니다.
 */
function createFinalAnswerInstructions(language) {
  if (normalizeLanguage(language) === 'en') {
    return `
You are the final-response writer for the LocalHub Seoul information chatbot.

Write a natural answer to the user using only:
- The user's question
- The natural-language analysis
- The supplied candidate JSON

Rules:

1. Recommend no more than three different candidates.

2. Never mention a place that is not in the candidate JSON.

3. Copy each selected name and location exactly from the candidate JSON.

4. Do not invent:
- Weather
- Current crowd levels
- Visitor counts
- Popularity
- Reviews
- Business hours
- Parking availability
- Prices
- Reservations
- Vacancies
- Facilities
- Verified suitability

5. If the analysis includes a limitation, explain it naturally as part of the answer.
Do not make it sound like a technical error message.

6. For atmosphere or purpose requests such as:
- Lively
- Quiet
- Rainy-day
- Date
- Family
- Children
- Photo spots

Explain that the recommendation is based only on the available category, name, address, and festival details.

7. If the candidates do not contain enough evidence to satisfy the request:
- Return status="no_match"
- Explain naturally which information is missing
- Do not force a recommendation

8. When status="recommendation":
- selected_names must contain the exact names used in the answer
- Include no more than three names

9. When status="no_match":
- selected_names must be an empty array

10. Keep the answer clear and conversational.

11. For each selected place, include:
- Place name
- Category
- Location
- A short and cautious reason grounded in the supplied data
`.trim()
  }

  return `
당신은 LocalHub 서울 지역정보 챗봇의 최종 답변 작성자입니다.

다음 정보만 이용하여 사용자에게 보여 줄 자연스러운 답변을 작성하세요.

- 사용자의 원래 질문
- OpenAI가 분석한 자연어 요청 결과
- LocalHub에서 검색한 후보 JSON

규칙:

1. 서로 다른 후보를 최대 3곳만 추천하세요.

2. 후보 JSON에 없는 장소는 절대 언급하지 마세요.

3. 선택한 장소명과 위치는 후보 JSON 값을 그대로 사용하세요.

4. 다음 정보는 절대 만들어 내지 마세요.

- 실제 날씨
- 현재 혼잡도
- 현재 방문객 수
- 실제 인기 순위
- 후기
- 평점
- 영업시간
- 현재 운영 여부
- 주차 가능 여부
- 실시간 가격
- 예약 가능 여부
- 숙소 빈방
- 대기시간
- 편의시설
- 검증된 가족·아동·반려동물 적합성

5. 분석 결과에 limitation이 있으면
딱딱한 오류 문구처럼 쓰지 말고 답변 속에 자연스럽게 설명하세요.

예시:

limitation:
"실시간 혼잡도는 확인할 수 없으므로 활기찬 분위기를 원하는 요청으로 해석합니다."

자연스러운 답변:
"현재 방문객 수를 직접 확인할 수는 없지만, 활기찬 분위기를 원하는 요청으로 이해하고 관광지와 쇼핑 장소를 중심으로 찾아봤어요."

6. 다음과 같은 분위기 또는 방문 목적 요청은
카테고리, 장소명, 주소, 축제 상세에서 확인되는 범위만 근거로 추천하세요.

- 활기찬 곳
- 사람이 많은 분위기
- 조용한 곳
- 힐링 장소
- 비 오는 날 갈 곳
- 실내 장소
- 데이트 장소
- 가족과 갈 곳
- 아이와 갈 곳
- 사진 찍기 좋은 곳

7. 후보 데이터에 사용자의 조건을 만족한다고 볼 근거가 부족하면
억지로 장소를 추천하지 마세요.

그 경우:

- status는 "no_match"
- selected_names는 빈 배열
- 어떤 정보가 부족한지 자연스럽게 설명
- 사용자가 다시 질문할 수 있는 구체적인 조건을 하나 제안

8. status가 "recommendation"이면
selected_names에 실제 답변에서 사용한 후보의 정확한 장소명을 넣으세요.

9. selected_names에는 최대 3개의 장소명만 넣으세요.

10. 답변은 챗봇이 대화하듯 자연스럽고 읽기 쉽게 작성하세요.

11. 장소를 추천하는 경우 각 장소에 다음 내용을 포함하세요.

- 장소명
- 유형
- 위치
- 제공된 데이터로 확인할 수 있는 짧고 조심스러운 추천 이유

12. 단순히 JSON 목록을 그대로 복사하지 말고
사용자의 질문 의도에 맞게 자연스럽게 연결해 설명하세요.
`.trim()
}

/**
 * 두 번째 OpenAI 호출입니다.
 *
 * 자연어 분석 결과와 후보 JSON을 전달해
 * 사용자에게 보여 줄 자연스러운 최종 답변을 작성합니다.
 */
async function createFinalAnswer(
  question,
  analysis,
  candidateItems,
  language,
) {
  return requestStructuredOutput({
    instructions: createFinalAnswerInstructions(language),

    input: textByLanguage(
      language,
      `사용자 질문:
${question}

자연어 분석 결과:
${JSON.stringify(analysis, null, 2)}

LocalHub 후보 JSON:
${JSON.stringify(candidateItems, null, 2)}`,
      `User question:
${question}

Natural-language analysis:
${JSON.stringify(analysis, null, 2)}

LocalHub candidate JSON:
${JSON.stringify(candidateItems, null, 2)}`,
    ),

    schemaName: 'localhub_final_answer',
    schema: FINAL_ANSWER_SCHEMA,
    maxOutputTokens: 1500,
    language,
  })
}

/**
 * 최종 OpenAI 응답이 후보 JSON에 근거했는지 검사합니다.
 */
function validateFinalAnswer(finalAnswer, candidateItems, language) {
  const candidateNames = new Set(
    candidateItems.map((item) => item.name),
  )

  const selectedNames = Array.isArray(finalAnswer?.selected_names)
    ? [...new Set(finalAnswer.selected_names)]
        .map((name) => String(name || '').trim())
        .filter(Boolean)
        .slice(0, 3)
    : []

  /*
   * OpenAI가 후보 JSON에 없는 장소를 선택했는지 검사합니다.
   */
  const hasInvalidName = selectedNames.some((name) => {
    return !candidateNames.has(name)
  })

  const answer = String(finalAnswer?.answer || '').trim()

  if (!answer) {
    return {
      status: 'no_match',

      text: textByLanguage(
        language,
        '제공된 지역정보에서 조건에 맞는 답변을 만들지 못했어요. 지역구나 원하는 장소 유형을 조금 더 구체적으로 알려주세요.',
        'I could not form an answer from the available local data. Please add a district or place type.',
      ),
    }
  }

  /*
   * 추천 상태인데 후보에 없는 장소명이 포함된 경우
   * 잘못된 장소를 출력하지 않습니다.
   */
  if (
    finalAnswer?.status === 'recommendation' &&
    hasInvalidName
  ) {
    return {
      status: 'no_match',

      text: textByLanguage(
        language,
        '제공된 데이터 안에서 안전하게 확인할 수 있는 장소를 찾지 못했어요. 지역구나 카테고리를 조금 더 구체적으로 질문해 주세요.',
        'I could not find a place that could be safely verified from the provided data. Please make the district or category more specific.',
      ),
    }
  }

  return {
    status:
      finalAnswer?.status === 'recommendation'
        ? 'recommendation'
        : 'no_match',

    text: answer,
  }
}

/**
 * chatbot.vue에서 호출하는 메인 함수입니다.
 */
export async function askRegionQuestion(
  question,
  language = 'ko',
) {
  const selectedLanguage = normalizeLanguage(language)
  const originalQuestion = String(question || '').trim()

  if (!originalQuestion) {
    return {
      status: 'error',
      error: 'empty_question',

      text: textByLanguage(
        selectedLanguage,
        '질문을 입력해 주세요.',
        'Enter a question.',
      ),
    }
  }

  try {
    /*
     * 1단계:
     * 모든 질문을 OpenAI에 먼저 전달합니다.
     *
     * 정규식이나 고정 키워드로 날씨, 혼잡도 등을 먼저 차단하지 않습니다.
     */
    const rawAnalysis = await analyzeQuestion(
      originalQuestion,
      selectedLanguage,
    )

    const analysis = sanitizeAnalysis(rawAnalysis)

    /*
     * 2단계:
     * OpenAI가 데이터로 답할 수 없다고 판단했거나
     * 추가 질문이 필요하다고 판단한 경우입니다.
     *
     * OpenAI가 사용자의 실제 질문에 맞게 작성한 자연어 답변을
     * 그대로 챗봇에 표시합니다.
     */
    if (
      analysis.action === 'unsupported' ||
      analysis.action === 'clarify'
    ) {
      return {
        status: 'openai_ok',

        text:
          analysis.answer ||
          textByLanguage(
            selectedLanguage,
            '현재 LocalHub 데이터로는 이 질문에 답하기 어려워요. 서울의 관광지, 문화시설, 축제, 레포츠, 쇼핑, 숙박, 여행코스를 질문해 주세요.',
            'This question cannot be answered with the current LocalHub data. Ask about Seoul attractions, cultural facilities, festivals, leisure, shopping, accommodation, or travel courses.',
          ),
      }
    }

    /*
     * 3단계:
     * OpenAI가 추출한 카테고리, 지역, 검색어, 날짜를 사용해
     * 실제 LocalHub JSON에서 후보를 찾습니다.
     */
    const candidateItems = await getCandidateItems(
      analysis,
      selectedLanguage,
    )

    /*
     * JSON 후보가 전혀 없다면 두 번째 OpenAI 호출을 하지 않고
     * 자연스러운 검색 결과 없음 문구를 표시합니다.
     */
    if (!candidateItems.length) {
      return {
        status: 'no_candidates',

        text: textByLanguage(
          selectedLanguage,
          'LocalHub가 보유한 지역정보에서는 요청하신 조건에 맞는 장소를 찾지 못했어요. 원하는 지역구나 장소 유형을 조금 더 구체적으로 알려주세요.',
          'No matching place was found in the LocalHub data. Please add a district or place type.',
        ),
      }
    }

    /*
     * 4단계:
     * 후보 JSON과 사용자의 질문을 다시 OpenAI에 전달해
     * 자연스러운 최종 답변을 작성합니다.
     */
    const rawFinalAnswer = await createFinalAnswer(
      originalQuestion,
      analysis,
      candidateItems,
      selectedLanguage,
    )

    /*
     * 5단계:
     * OpenAI가 후보 JSON에 없는 장소를 만들지 않았는지 검증합니다.
     */
    const finalAnswer = validateFinalAnswer(
      rawFinalAnswer,
      candidateItems,
      selectedLanguage,
    )

    return {
      status:
        finalAnswer.status === 'recommendation'
          ? 'openai_ok'
          : 'no_candidates',

      text: finalAnswer.text,
    }
  } catch (error) {
    return {
      status: 'openai_error',

      error:
        error instanceof Error
          ? error.message
          : String(error),

      text: textByLanguage(
        selectedLanguage,
        '답변을 만드는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        'An error occurred while creating the answer. Please try again later.',
      ),
    }
  }
}
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-5-mini'
const OPENAI_API_URL = 'https://api.openai.com/v1/responses'

function createDataset(type, ko, en, file, keywords) {
  return {
    type,
    label: { ko, en },
    file,
    keywords: keywords.split('|'),
  }
}

const DATASETS = [
  createDataset(
    '관광지',
    '관광지',
    'tourist attractions',
    '서울_관광지.json',
    '관광지|관광|명소|가볼만한 곳|가볼 만한 곳|가볼 곳|공원|데이트|카페거리|카페 거리|attraction|attractions|tourist attraction|tourism|sightseeing|landmark|landmarks|palace|park|places to visit|cafe street',
  ),
  createDataset(
    '문화시설',
    '문화시설',
    'cultural facilities',
    '서울_문화시설.json',
    '문화시설|문화|박물관|미술관|갤러리|전시|공연장|극장|cultural facility|cultural facilities|museum|museums|art museum|gallery|exhibition|theater|theatre',
  ),
  createDataset(
    '축제공연행사',
    '축제공연행사',
    'festivals and events',
    '서울_축제공연행사.json',
    '축제|공연|행사|페스티벌|이벤트|festival|festivals|event|events|performance|concert',
  ),
  createDataset(
    '레포츠',
    '레포츠',
    'leisure activities',
    '서울_레포츠.json',
    '레포츠|스포츠|운동|둘레길|등산|트레킹|체험|leisure|sports|exercise|hiking|trail|trekking|activity|activities|experience',
  ),
  createDataset(
    '쇼핑',
    '쇼핑',
    'shopping places',
    '서울_쇼핑.json',
    '쇼핑|시장|백화점|아울렛|상점|매장|기념품|shopping|market|markets|department store|outlet|store|shop|souvenir',
  ),
  createDataset(
    '숙박',
    '숙박',
    'accommodation',
    '서울_숙박.json',
    '숙박|숙소|호텔|게스트하우스|모텔|한옥스테이|accommodation|hotel|hotels|guesthouse|motel|stay|lodging',
  ),
  createDataset(
    '여행코스',
    '여행코스',
    'travel courses',
    '서울_여행코스.json',
    '여행코스|여행 코스|코스|일정|동선|당일치기|하루 여행|travel course|travel courses|itinerary|route|day trip|one-day trip',
  ),
]

const DISTRICTS = `
종로구,Jongno-gu,jongno
중구,Jung-gu,jung
용산구,Yongsan-gu,yongsan
성동구,Seongdong-gu,seongdong
광진구,Gwangjin-gu,gwangjin
동대문구,Dongdaemun-gu,dongdaemun
중랑구,Jungnang-gu,jungnang
성북구,Seongbuk-gu,seongbuk
강북구,Gangbuk-gu,gangbuk
도봉구,Dobong-gu,dobong
노원구,Nowon-gu,nowon
은평구,Eunpyeong-gu,eunpyeong
서대문구,Seodaemun-gu,seodaemun
마포구,Mapo-gu,mapo
양천구,Yangcheon-gu,yangcheon
강서구,Gangseo-gu,gangseo
구로구,Guro-gu,guro
금천구,Geumcheon-gu,geumcheon
영등포구,Yeongdeungpo-gu,yeongdeungpo
동작구,Dongjak-gu,dongjak
관악구,Gwanak-gu,gwanak
서초구,Seocho-gu,seocho
강남구,Gangnam-gu,gangnam
송파구,Songpa-gu,songpa
강동구,Gangdong-gu,gangdong
`
  .trim()
  .split('\n')
  .map((row) => {
    const [value, en, romanized] = row.split(',')

    return {
      value,
      en,
      aliases: [romanized, `${romanized}-gu`, `${romanized} gu`],
    }
  })

const FOOD_KEYWORDS =
  '맛집|음식|음식점|식당|한식|중식|일식|양식|먹을 곳|restaurant|restaurants|food place|places to eat|eatery|korean food|chinese food|japanese food'.split(
    '|',
  )

const PLACE_CONTEXT_PATTERN =
  /(관광지|관광|명소|가볼\s*만한\s*곳|가볼\s*곳|공원|데이트|카페\s*거리|문화시설|박물관|미술관|갤러리|전시|공연장|극장|축제|공연|행사|페스티벌|레포츠|스포츠|운동|둘레길|등산|트레킹|체험|쇼핑|시장|백화점|아울렛|숙박|숙소|호텔|게스트하우스|모텔|여행\s*코스|당일치기|attractions?|tourism|sightseeing|landmarks?|palaces?|parks?|places?\s+to\s+visit|cultural\s+facilit(?:y|ies)|museums?|galler(?:y|ies)|exhibitions?|theat(?:er|re)s?|festivals?|events?|performances?|concerts?|leisure|sports?|hiking|trails?|trekking|shopping|markets?|outlets?|accommodation|hotels?|guesthouses?|motels?|travel\s+courses?|itinerar(?:y|ies)|routes?|day\s+trips?)/i

const OUT_OF_SCOPE_RULES = [
  {
    topic: 'weather',
    pattern:
      /(날씨|기온|온도|강수\s*확률|일기\s*예보|미세먼지|초미세먼지|weather|temperature|forecast|air\s+quality)/i,
    allowWithPlaceContext: true,
  },
  {
    topic: 'finance',
    pattern:
      /(주식|주가|코인|비트코인|가상화폐|환율|증시|stock\s*(?:price|market)?|bitcoin|crypto(?:currency)?|exchange\s+rate)/i,
  },
  {
    topic: 'news',
    pattern:
      /(뉴스|속보|시사|정치|선거|대통령|news|breaking\s+news|politics|election)/i,
  },
  {
    topic: 'calculation',
    pattern:
      /(계산해\s*줘|계산해\s*주세요|방정식|미분|적분|수학\s*문제|calculate|calculation|differentiat(?:e|ion)|integrat(?:e|ion))/i,
  },
  {
    topic: 'translation',
    pattern:
      /(번역해\s*줘|번역해\s*주세요|영어로\s*번역|한국어로\s*번역|translate\s+(?:this|it|to))/i,
  },
  {
    topic: 'programming',
    pattern:
      /(코딩|프로그래밍|파이썬|자바스크립트|자바\s*코드|알고리즘\s*문제|coding|programming|python\s+code|javascript\s+code|java\s+code)/i,
  },
  {
    topic: 'time',
    pattern:
      /(지금\s*몇\s*시|현재\s*시간|오늘\s*날짜|무슨\s*요일|what\s+time\s+is\s+it|current\s+time|today'?s\s+date|what\s+day\s+is\s+it)/i,
  },
]

const STOP_WORDS = new Set(
  '서울|서울시|서울특별시|지역|장소|정보|추천|추천해줘|추천해주세요|알려줘|알려주세요|찾아줘|찾아주세요|어디|있는|있나요|가볼만한|제공된|데이터|정확히|서로|다른|seoul|recommend|recommended|recommendation|recommendations|find|show|tell|please|place|places|information|near|nearby|in|the|a|an'.split(
    '|',
  ),
)

const TOKEN_ALIASES = {
  attraction: ['관광지', '명소'],
  attractions: ['관광지', '명소'],
  landmark: ['명소'],
  landmarks: ['명소'],
  palace: ['궁', '궁궐'],
  palaces: ['궁', '궁궐'],
  park: ['공원'],
  parks: ['공원'],
  museum: ['박물관'],
  museums: ['박물관'],
  gallery: ['미술관', '갤러리'],
  galleries: ['미술관', '갤러리'],
  festival: ['축제'],
  festivals: ['축제'],
  market: ['시장'],
  markets: ['시장'],
  shopping: ['쇼핑', '시장'],
  hotel: ['호텔'],
  hotels: ['호텔'],
  accommodation: ['숙박', '호텔'],
  hiking: ['등산'],
  trail: ['둘레길', '트레킹'],
  course: ['코스'],
  itinerary: ['코스', '일정'],
}

const datasetCache = new Map()

function normalizeLanguage(language) {
  return language === 'en' ? 'en' : 'ko'
}

function textByLanguage(language, koreanText, englishText) {
  return normalizeLanguage(language) === 'en' ? englishText : koreanText
}

function extractOriginalQuestion(value) {
  const text = String(value || '').trim()

  if (!text) {
    return ''
  }

  const match = text.match(
    /(?:사용자 질문|user question)\s*:\s*([\s\S]*?)(?=\n\s*\n|$)/i,
  )

  return match?.[1]?.trim() || text
}

function includesKeyword(question, keywords) {
  const normalizedQuestion = String(question || '').toLowerCase()

  return keywords.some((keyword) => {
    return normalizedQuestion.includes(keyword.toLowerCase())
  })
}

function containsFoodKeyword(question) {
  return includesKeyword(question, FOOD_KEYWORDS)
}

function detectOutOfScopeTopic(question) {
  const normalizedQuestion = String(question || '').trim()

  for (const rule of OUT_OF_SCOPE_RULES) {
    if (!rule.pattern.test(normalizedQuestion)) {
      continue
    }

    if (
      rule.allowWithPlaceContext &&
      PLACE_CONTEXT_PATTERN.test(normalizedQuestion)
    ) {
      continue
    }

    return rule.topic
  }

  return null
}

function createOutOfScopeMessage(language) {
  return textByLanguage(
    language,
    '죄송하지만 LocalHub 챗봇은 서울의 관광지, 문화시설, 축제, 레포츠, 쇼핑, 숙박, 여행코스 정보만 안내할 수 있습니다.\n예: 노원구 관광지, 종로구 박물관, 마포구 쇼핑',
    'Sorry, the LocalHub chatbot only answers questions about Seoul attractions, cultural facilities, festivals, leisure activities, shopping, accommodation, and travel courses.\nExamples: Nowon-gu attractions, Jongno-gu museums, Mapo-gu shopping',
  )
}

function detectDistrict(question) {
  const originalText = String(question || '')
  const normalizedText = originalText.toLowerCase()

  for (const district of DISTRICTS) {
    if (originalText.includes(district.value)) {
      return district
    }

    const shortKoreanName = district.value.replace(/구$/, '')

    if (
      shortKoreanName.length >= 2 &&
      originalText.includes(shortKoreanName)
    ) {
      return district
    }

    if (district.aliases.some((alias) => normalizedText.includes(alias))) {
      return district
    }
  }

  return null
}

function detectDataset(question) {
  return DATASETS.find((dataset) => {
    return includesKeyword(question, dataset.keywords)
  })
}

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

function createAddress(item) {
  return [item?.addr1, item?.addr2]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim())
    .join(' ')
    .trim()
}

function formatRecommendations(recommendations, language) {
  const labels = normalizeLanguage(language) === 'en'
    ? { name: 'Name', location: 'Location' }
    : { name: '이름', location: '위치' }

  return recommendations
    .slice(0, 3)
    .map((item, index) => {
      return (
        `${index + 1}.\n` +
        `- ${labels.name}: ${item.name}\n` +
        `- ${labels.location}: ${item.location}`
      )
    })
    .join('\n\n')
}

async function findDistrictRecommendations(question, language) {
  const district = detectDistrict(question)

  if (!district) {
    return null
  }

  const dataset =
    detectDataset(question) ||
    DATASETS.find((item) => item.type === '관광지')

  const loadedDataset = await loadDataset(dataset, language)
  const recommendations = []
  const usedNames = new Set()

  for (const item of loadedDataset.items) {
    const name = String(item?.title || '').trim()
    const location = createAddress(item)

    if (!name || !location || !location.includes(district.value)) {
      continue
    }

    const normalizedName = name.replace(/\s+/g, ' ').toLowerCase()

    if (usedNames.has(normalizedName)) {
      continue
    }

    usedNames.add(normalizedName)
    recommendations.push({ name, location })

    if (recommendations.length === 3) {
      break
    }
  }

  const selectedLanguage = normalizeLanguage(language)
  const districtLabel = selectedLanguage === 'en' ? district.en : district.value
  const categoryLabel = dataset.label[selectedLanguage]

  if (recommendations.length === 0) {
    return textByLanguage(
      language,
      `${districtLabel}에서 주소가 확인되는 ${categoryLabel} 정보를 찾지 못했습니다.`,
      `No ${categoryLabel} with a confirmed address were found in ${districtLabel}.`,
    )
  }

  if (recommendations.length < 3) {
    return (
      textByLanguage(
        language,
        `${districtLabel}에서 주소가 확인되는 ${categoryLabel}는 ${recommendations.length}곳입니다.`,
        `${recommendations.length} ${categoryLabel} with confirmed addresses were found in ${districtLabel}.`,
      ) +
      '\n\n' +
      formatRecommendations(recommendations, language)
    )
  }

  return formatRecommendations(recommendations, language)
}

function extractSearchTokens(question) {
  const rawTokens = String(question || '')
    .toLowerCase()
    .replace(/[^0-9a-zA-Z가-힣\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => {
      return token
        .replace(/에서$/, '')
        .replace(/으로$/, '')
        .replace(/근처$/, '')
        .replace(/주변$/, '')
        .replace(/-gu$/, '')
    })
    .filter((token) => token.length >= 2)
    .filter((token) => !STOP_WORDS.has(token))

  const expandedTokens = [...rawTokens]

  for (const token of rawTokens) {
    expandedTokens.push(...(TOKEN_ALIASES[token] || []))
  }

  return [...new Set(expandedTokens)]
}

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
    item?.usetimefestival,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function calculateScore(item, category, tokens, district) {
  const searchableText = createSearchableText(item, category)
  const title = String(item?.title || '').toLowerCase()
  let score = 0

  if (district && searchableText.includes(district.value.toLowerCase())) {
    score += 30
  }

  for (const token of tokens) {
    if (searchableText.includes(token)) {
      score += 4
    }

    if (title.includes(token)) {
      score += 8
    }
  }

  // 이미지 점수는 실제 검색어 또는 지역이 일치한 경우에만 적용합니다.
  if (score > 0 && item?.firstimage) {
    score += 1
  }

  return score
}

function normalizeItem(item, category) {
  const normalizedItem = {
    category,
    name: String(item?.title || '').trim(),
    location: createAddress(item),
    telephone: String(item?.tel || '').trim(),
    longitude: String(item?.mapx || '').trim(),
    latitude: String(item?.mapy || '').trim(),
  }

  if (category !== '축제공연행사') {
    return normalizedItem
  }

  return {
    ...normalizedItem,
    eventStartDate: item?.eventstartdate || '',
    eventEndDate: item?.eventenddate || '',
    eventPlace: item?.eventplace || '',
    playTime: item?.playtime || '',
    program: item?.program || '',
    fee: item?.usetimefestival || '',
  }
}

async function getCandidateItems(question, language) {
  const selectedDataset = detectDataset(question)
  const targetDatasets = selectedDataset ? [selectedDataset] : DATASETS
  const district = detectDistrict(question)
  const tokens = extractSearchTokens(question)

  const candidateGroups = await Promise.all(
    targetDatasets.map(async (dataset) => {
      const loadedDataset = await loadDataset(dataset, language)

      const matchedItems = loadedDataset.items
        .map((item, index) => ({
          item,
          index,
          score: calculateScore(item, dataset.type, tokens, district),
        }))
        .filter(({ item, score }) => {
          return (
            score > 0 &&
            Boolean(item?.title) &&
            Boolean(createAddress(item))
          )
        })
        .sort((first, second) => {
          if (second.score !== first.score) {
            return second.score - first.score
          }

          return first.index - second.index
        })

      const limit = targetDatasets.length === 1 ? 25 : 5

      // 일치 항목이 없을 때 데이터 앞부분을 임의로 반환하지 않습니다.
      return matchedItems
        .slice(0, limit)
        .map(({ item }) => normalizeItem(item, dataset.type))
    }),
  )

  return candidateGroups
    .flat()
    .filter((item) => item.name && item.location)
    .slice(0, 35)
}

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

function createInstructions(language) {
  if (normalizeLanguage(language) === 'en') {
    return `
You are the LocalHub assistant for Seoul local information.
Select places only from the supplied candidate JSON data.

Rules:
1. Select exactly three different places that match the question.
2. For each place, write only its name and location.
3. Do not select places without an address.
4. Do not guess information that is not provided.
5. Do not answer unrelated questions such as weather, news, finance, translation, calculation, or programming.
6. Do not add a greeting, recommendation reason, conclusion, or source.
7. Answer in English, but preserve Korean proper names and addresses when no official English value is supplied.
8. Use only this format:

1.
- Name: Place name
- Location: Address

2.
- Name: Place name
- Location: Address

3.
- Name: Place name
- Location: Address
    `.trim()
  }

  return `
당신은 서울 지역정보를 안내하는 LocalHub 도우미입니다.
반드시 제공된 후보 JSON 데이터에서만 장소를 선택하세요.

답변 규칙:
1. 질문에 맞는 서로 다른 장소를 정확히 3곳 선택하세요.
2. 장소마다 이름과 위치만 작성하세요.
3. 주소가 없는 장소는 선택하지 마세요.
4. 제공되지 않은 정보는 추측하지 마세요.
5. 날씨, 뉴스, 금융, 번역, 계산, 프로그래밍 등 LocalHub와 무관한 질문에는 답하지 마세요.
6. 인사말, 추천 이유, 결론, 출처는 작성하지 마세요.
7. 반드시 아래 형식으로만 작성하세요.

1.
- 이름: 장소명
- 위치: 주소

2.
- 이름: 장소명
- 위치: 주소

3.
- 이름: 장소명
- 위치: 주소
  `.trim()
}

async function requestOpenAIAnswer(question, candidateItems, language) {
  if (!OPENAI_API_KEY) {
    throw new Error(
      textByLanguage(
        language,
        'OpenAI API 키가 없습니다. 프로젝트 루트의 .env 파일을 확인해 주세요.',
        'The OpenAI API key is missing. Check the project root .env file.',
      ),
    )
  }

  const isEnglish = normalizeLanguage(language) === 'en'
  const userQuestionLabel = isEnglish ? 'User question' : '사용자 질문'
  const candidateLabel = isEnglish
    ? 'Candidate JSON data'
    : '후보 JSON 데이터'

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: createInstructions(language),
      input: `${userQuestionLabel}:\n${question}\n\n${candidateLabel}:\n${JSON.stringify(
        candidateItems,
        null,
        2,
      )}`,
      max_output_tokens: 1000,
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

      if (errorData?.error?.message) {
        errorMessage = errorData.error.message
      }
    } catch {
      // JSON이 아닌 오류 응답이면 기본 메시지를 사용합니다.
    }

    throw new Error(errorMessage)
  }

  const responseData = await response.json()
  const answer = extractOutputText(responseData)

  if (answer) {
    return answer
  }

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
      'OpenAI 응답에서 답변 내용을 찾지 못했습니다.',
      'No answer text was found in the OpenAI response.',
    ),
  )
}

export async function askRegionQuestion(question, language = 'ko') {
  const selectedLanguage = normalizeLanguage(language)
  const originalQuestion = extractOriginalQuestion(question)

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

  if (containsFoodKeyword(originalQuestion)) {
    return {
      status: 'no_data_category',
      text: textByLanguage(
        selectedLanguage,
        '현재 음식점 데이터는 제공하지 않습니다.\n관광지, 문화시설, 축제, 레포츠, 쇼핑, 숙박 또는 여행코스를 질문해 주세요.',
        'Restaurant data is not currently available.\nAsk about attractions, cultural facilities, festivals, leisure activities, shopping, accommodation, or travel courses.',
      ),
    }
  }

  // 무관한 질문은 데이터 검색과 OpenAI API 호출 전에 차단합니다.
  const outOfScopeTopic = detectOutOfScopeTopic(originalQuestion)

  if (outOfScopeTopic) {
    return {
      status: 'out_of_scope',
      error: outOfScopeTopic,
      text: createOutOfScopeMessage(selectedLanguage),
    }
  }

  const districtAnswer = await findDistrictRecommendations(
    originalQuestion,
    selectedLanguage,
  )

  if (districtAnswer) {
    return {
      status: 'district_search',
      text: districtAnswer,
    }
  }

  const candidateItems = await getCandidateItems(
    originalQuestion,
    selectedLanguage,
  )

  if (candidateItems.length === 0) {
    const hasLocalInformationContext =
      Boolean(detectDataset(originalQuestion)) ||
      Boolean(detectDistrict(originalQuestion)) ||
      PLACE_CONTEXT_PATTERN.test(originalQuestion) ||
      /서울|서울시|서울특별시|seoul/i.test(originalQuestion)

    return {
      status: hasLocalInformationContext ? 'no_candidates' : 'out_of_scope',
      text: hasLocalInformationContext
        ? textByLanguage(
            selectedLanguage,
            '제공된 서울 지역정보 데이터에서 관련 장소를 찾지 못했습니다. 지역구와 카테고리를 함께 입력해 주세요.\n예: 노원구 관광지, 종로구 문화시설',
            'No matching place was found in the provided Seoul local-information data. Enter a district and category together.\nExamples: Nowon-gu attractions, Jongno-gu cultural facilities',
          )
        : createOutOfScopeMessage(selectedLanguage),
    }
  }

  try {
    const answer = await requestOpenAIAnswer(
      originalQuestion,
      candidateItems,
      selectedLanguage,
    )

    return {
      status: 'openai_ok',
      text: answer,
    }
  } catch (error) {
    return {
      status: 'openai_error',
      error: error instanceof Error ? error.message : String(error),
      text: textByLanguage(
        selectedLanguage,
        '추천 정보를 가져오는 중에 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        'An error occurred while loading recommendations. Please try again later.',
      ),
    }
  }
}

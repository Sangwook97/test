const API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-5-mini'
const API_URL = 'https://api.openai.com/v1/responses'

const DATASETS = [
  [
    '관광지',
    '서울_관광지.json',
    [
      '관광지',
      '관광',
      '명소',
      '가볼만한 곳',
      '가볼 만한 곳',
      '가볼 곳',
      '공원',
      '전망대',
      '궁궐',
      '카페거리',
      'attraction',
      'tourism',
      'sightseeing',
      'landmark',
      'park',
      'places to visit',
    ],
  ],
  [
    '문화시설',
    '서울_문화시설.json',
    [
      '문화시설',
      '박물관',
      '미술관',
      '갤러리',
      '전시',
      '공연장',
      '극장',
      '실내',
      'cultural facility',
      'museum',
      'gallery',
      'exhibition',
      'theater',
      'indoor',
    ],
  ],
  [
    '축제공연행사',
    '서울_축제공연행사.json',
    [
      '축제',
      '공연',
      '행사',
      '페스티벌',
      '콘서트',
      'festival',
      'event',
      'performance',
      'concert',
    ],
  ],
  [
    '레포츠',
    '서울_레포츠.json',
    [
      '레포츠',
      '스포츠',
      '운동',
      '둘레길',
      '등산',
      '트레킹',
      '체험',
      '액티비티',
      'leisure',
      'sports',
      'hiking',
      'trail',
      'trekking',
      'activity',
    ],
  ],
  [
    '쇼핑',
    '서울_쇼핑.json',
    [
      '쇼핑',
      '시장',
      '백화점',
      '아울렛',
      '상점',
      '매장',
      '기념품',
      'shopping',
      'market',
      'department store',
      'outlet',
      'store',
      'shop',
    ],
  ],
  [
    '숙박',
    '서울_숙박.json',
    [
      '숙박',
      '숙소',
      '호텔',
      '게스트하우스',
      '모텔',
      '한옥스테이',
      '머물 곳',
      'accommodation',
      'hotel',
      'guesthouse',
      'motel',
      'stay',
      'lodging',
    ],
  ],
  [
    '여행코스',
    '서울_여행코스.json',
    [
      '여행코스',
      '여행 코스',
      '관광코스',
      '데이트 코스',
      '동선',
      '당일치기',
      '하루 여행',
      'travel course',
      'itinerary',
      'route',
      'day trip',
    ],
  ],
].map(([type, file, keywords]) => ({
  type,
  file,
  keywords,
}))

const DISTRICTS = [
  ['종로구', 'jongno'],
  ['중구', 'jung-gu'],
  ['용산구', 'yongsan'],
  ['성동구', 'seongdong'],
  ['광진구', 'gwangjin'],
  ['동대문구', 'dongdaemun'],
  ['중랑구', 'jungnang'],
  ['성북구', 'seongbuk'],
  ['강북구', 'gangbuk'],
  ['도봉구', 'dobong'],
  ['노원구', 'nowon'],
  ['은평구', 'eunpyeong'],
  ['서대문구', 'seodaemun'],
  ['마포구', 'mapo'],
  ['양천구', 'yangcheon'],
  ['강서구', 'gangseo'],
  ['구로구', 'guro'],
  ['금천구', 'geumcheon'],
  ['영등포구', 'yeongdeungpo'],
  ['동작구', 'dongjak'],
  ['관악구', 'gwanak'],
  ['서초구', 'seocho'],
  ['강남구', 'gangnam'],
  ['송파구', 'songpa'],
  ['강동구', 'gangdong'],
]

const FOOD =
  /(맛집|음식점|식당|먹을\s*곳|한식|중식|일식|양식|restaurants?|places?\s+to\s+eat|food\s+place)/i

const PLACE_INTENT =
  /(추천|찾아|알려|어디|가고\s*싶|갈\s*곳|가볼\s*만한|나들이|놀러|데이트|여행|구경|산책|머물|숙박|숙소|호텔|쉬고\s*싶|체험|쇼핑|축제|공연|관광|명소|박물관|미술관|공원|둘레길|시장|where\s+(?:should|can)|want\s+to\s+(?:go|visit|stay)|recommend|find|places?\s+to\s+visit|somewhere|attractions?|museums?|hotels?|shopping|festivals?)/i

const WEATHER =
  /(날씨|기온|온도|강수\s*확률|일기\s*예보|미세먼지|초미세먼지|weather|temperature|forecast|air\s+quality)/i

const WEATHER_CONDITION =
  /(비\s*(?:오는|올|오고|오는데)|눈\s*(?:오는|올)|더운\s*날|추운\s*날|실내|rainy\s+day|when\s+it\s+rains|hot\s+day|cold\s+day|indoor)/i

const WEATHER_FACT =
  /((오늘|내일|모레|이번\s*주).{0,15}(날씨|기온|온도|강수|비|눈|미세먼지)|(날씨|기온|온도|강수\s*확률|미세먼지).{0,15}(어때|어떠|알려|몇\s*도|예보|전망|올까|오니)|what(?:'s|\s+is)\s+the\s+weather|weather\s+(?:today|tomorrow|forecast)|temperature\s+(?:today|tomorrow))/i

const LIVE_CROWD =
  /((지금|현재|오늘|실시간).{0,20}(사람|인파|혼잡|붐비|대기)|(사람|인파|혼잡|붐비|대기).{0,20}(지금|현재|실시간|몇\s*명|현황|어때|많아|적어)|(?:right\s+now|currently|live).{0,20}(crowd|crowded|busy|wait))/i

const LIVE_OPERATION =
  /((지금|현재|오늘|실시간).{0,20}(문\s*열|영업|운영|예약|빈\s*방|잔여|대기\s*시간|입장\s*가능|가격)|(문\s*열|영업|운영|예약|빈\s*방|잔여|대기\s*시간|가격).{0,20}(지금|현재|오늘|실시간)|(?:open|available|vacancy|wait\s*time|reservation|price).{0,20}(?:right\s+now|today|currently|live))/i

const OTHER_UNSUPPORTED =
  /(주식|주가|코인|비트코인|환율|정치|선거|뉴스|속보|번역해|계산해|방정식|미분|적분|코딩|프로그래밍|파이썬|자바스크립트|stock\s*(?:price|market)?|bitcoin|crypto|exchange\s+rate|politics|election|breaking\s+news|translate|calculate|programming|python\s+code|javascript\s+code)/i

const PREFERENCES = [
  [
    /(사람\s*많|북적|붐비|활기|핫플|crowded|lively|busy\s+place)/i,
    ['관광지', '쇼핑', '축제공연행사'],
    ['시장', '거리', '광장', '축제', '쇼핑', '공원'],
  ],
  [
    /(조용|한적|힐링|여유|쉬고\s*싶|자연|quiet|peaceful|relaxing|nature)/i,
    ['관광지', '레포츠', '여행코스'],
    ['공원', '숲', '산', '둘레길', '한강'],
  ],
  [
    /(비\s*(?:오는|올|오고|오는데)|실내|더운\s*날|추운\s*날|rainy|indoor|hot\s+day|cold\s+day)/i,
    ['문화시설', '쇼핑'],
    ['박물관', '미술관', '전시', '백화점'],
  ],
  [
    /(데이트|연인|커플|기념일|date|couple|romantic)/i,
    ['관광지', '문화시설', '쇼핑'],
    ['공원', '거리', '전망', '미술관'],
  ],
  [
    /(아이|어린이|가족|부모님|family|kids|children|child)/i,
    ['관광지', '문화시설', '레포츠'],
    ['어린이', '공원', '박물관', '체험'],
  ],
  [
    /(친구|여럿이|단체|friends?|group)/i,
    ['관광지', '문화시설', '레포츠', '쇼핑', '축제공연행사'],
    ['체험', '공원', '시장', '축제'],
  ],
  [
    /(사진|포토|인생샷|전망|야경|photo|picture|view|night\s+view)/i,
    ['관광지', '문화시설'],
    ['전망', '공원', '거리', '미술관'],
  ],
].map(([pattern, types, tokens]) => ({
  pattern,
  types,
  tokens,
}))

const STOP_WORDS = new Set([
  '서울',
  '서울시',
  '서울특별시',
  '지역',
  '장소',
  '정보',
  '추천',
  '추천해줘',
  '추천해주세요',
  '알려줘',
  '알려주세요',
  '찾아줘',
  '찾아주세요',
  '어디',
  '가고',
  '가고싶어',
  '싶어',
  '사람',
  '많은데',
  'seoul',
  'recommend',
  'find',
  'show',
  'tell',
  'please',
  'place',
  'places',
  'somewhere',
  'want',
  'with',
  'the',
  'and',
])

const cache = new Map()

const lang = (value) => (value === 'en' ? 'en' : 'ko')

const pickText = (language, ko, en) =>
  lang(language) === 'en' ? en : ko

const includes = (source, target) =>
  String(source || '')
    .toLowerCase()
    .includes(String(target || '').toLowerCase())

function detectDistrict(question) {
  const text = String(question || '')
  const lower = text.toLowerCase()

  for (const [korean, english] of DISTRICTS) {
    const shortName = korean.replace(/구$/, '')

    if (
      text.includes(korean) ||
      (shortName.length >= 2 && text.includes(shortName))
    ) {
      return korean
    }

    if (
      lower.includes(english) ||
      lower.includes(`${english}-gu`) ||
      lower.includes(`${english} gu`)
    ) {
      return korean
    }
  }

  return ''
}

function explicitDatasets(question) {
  return DATASETS.filter((dataset) =>
    dataset.keywords.some((keyword) => includes(question, keyword)),
  )
}

function preferenceContext(question) {
  const matched = PREFERENCES.filter((rule) =>
    rule.pattern.test(String(question || '')),
  )

  return {
    types: [...new Set(matched.flatMap((rule) => rule.types))],
    tokens: [...new Set(matched.flatMap((rule) => rule.tokens))],
  }
}

function isPlaceQuestion(question) {
  return (
    PLACE_INTENT.test(String(question || '')) ||
    explicitDatasets(question).length > 0 ||
    Boolean(detectDistrict(question)) ||
    preferenceContext(question).types.length > 0
  )
}

function unsupportedTopic(question) {
  const text = String(question || '').trim()

  if (LIVE_CROWD.test(text)) {
    return 'crowd'
  }

  if (LIVE_OPERATION.test(text)) {
    return 'operation'
  }

  if (WEATHER.test(text)) {
    const recommendation =
      isPlaceQuestion(text) &&
      WEATHER_CONDITION.test(text) &&
      !WEATHER_FACT.test(text)

    if (!recommendation) {
      return 'weather'
    }
  }

  if (OTHER_UNSUPPORTED.test(text)) {
    return 'general'
  }

  return ''
}

function unsupportedMessage(topic, language) {
  if (topic === 'weather') {
    return pickText(
      language,
      `죄송하지만 현재 LocalHub 데이터에는 실시간 날씨, 기온, 강수 예보, 미세먼지 정보가 포함되어 있지 않아 답변할 수 없어요.

대신 날씨를 장소 추천 조건으로 질문할 수 있습니다.
예: 비 오는 날 갈 만한 실내 문화시설, 더운 날 둘러보기 좋은 쇼핑 장소`,
      `Sorry, LocalHub does not contain live weather, temperature, rain forecasts, or air-quality data.

You can still use weather as a place preference, such as indoor places for a rainy day.`,
    )
  }

  if (topic === 'crowd') {
    return pickText(
      language,
      `죄송하지만 LocalHub 데이터에는 실시간 방문객 수나 혼잡도 정보가 없어 지금 사람이 많은 장소를 확인할 수 없어요.

대신 원하는 분위기를 기준으로 추천받을 수 있습니다.
예: 활기찬 분위기의 관광명소, 조용하게 쉬기 좋은 장소`,
      `Sorry, LocalHub does not contain live visitor counts or crowd levels.

You can still ask for lively or quiet places as an atmosphere preference.`,
    )
  }

  if (topic === 'operation') {
    return pickText(
      language,
      `죄송하지만 LocalHub 데이터에는 실시간 영업 여부, 예약 가능 여부, 빈방, 대기시간, 현재 가격 정보가 없어 확인할 수 없어요.

대신 관광지, 문화시설, 축제, 레포츠, 쇼핑, 숙박, 여행코스의 이름과 위치를 찾아드릴 수 있습니다.`,
      `Sorry, LocalHub does not contain live opening, reservation, vacancy, waiting-time, or current-price data.

I can still find the names and locations of supported Seoul places.`,
    )
  }

  return pickText(
    language,
    `죄송하지만 해당 내용은 LocalHub가 보유한 서울 지역정보 데이터로 답변하기 어려워요.

관광지, 문화시설, 축제, 레포츠, 쇼핑, 숙박, 여행코스는 자연스럽게 질문할 수 있습니다.
예: 사람 많은 분위기의 장소에 가고 싶어, 비 오는 날 갈 만한 실내 장소, 강남구 숙소 추천`,
    `Sorry, that question cannot be answered with LocalHub data.

You can ask naturally about attractions, cultural facilities, festivals, leisure, shopping, accommodation, and travel courses.`,
  )
}

async function loadItems(dataset, language) {
  if (cache.has(dataset.file)) {
    return cache.get(dataset.file)
  }

  const response = await fetch(`/data/${dataset.file}`)

  if (!response.ok) {
    throw new Error(
      pickText(
        language,
        `${dataset.file} 파일을 불러오지 못했습니다.`,
        `${dataset.file} could not be loaded.`,
      ),
    )
  }

  const data = await response.json()

  if (!Array.isArray(data?.items)) {
    throw new Error(
      pickText(
        language,
        `${dataset.file}에서 items 배열을 찾지 못했습니다.`,
        `No items array was found in ${dataset.file}.`,
      ),
    )
  }

  cache.set(dataset.file, data.items)

  return data.items
}

function addressOf(item, category, language) {
  const address = [item?.addr1, item?.addr2]
    .filter(
      (value) =>
        typeof value === 'string' &&
        value.trim(),
    )
    .map((value) => value.trim())
    .join(' ')
    .trim()

  if (address) {
    return address
  }

  if (category === '여행코스') {
    return pickText(
      language,
      '서울 (세부 주소 정보 없음)',
      'Seoul (detailed address unavailable)',
    )
  }

  return ''
}

function searchableText(item, category) {
  return [
    category,
    item?.title,
    item?.addr1,
    item?.addr2,
    item?.eventplace,
    item?.program,
    item?.subevent,
    item?.sponsor1,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function tokensOf(question) {
  return [
    ...new Set(
      String(question || '')
        .toLowerCase()
        .replace(/[^0-9a-zA-Z가-힣\s-]/g, ' ')
        .split(/\s+/)
        .map((token) =>
          token
            .replace(/에서$/, '')
            .replace(/으로$/, '')
            .replace(/근처$/, '')
            .replace(/주변$/, '')
            .replace(/-gu$/, ''),
        )
        .filter(
          (token) =>
            token.length >= 2 &&
            !STOP_WORDS.has(token),
        ),
    ),
  ]
}

function scoreItem(item, category, tokens, district) {
  const text = searchableText(item, category)
  const title = String(item?.title || '').toLowerCase()

  let score =
    district &&
    text.includes(district.toLowerCase())
      ? 40
      : 0

  for (const token of tokens) {
    if (text.includes(token)) {
      score += 4
    }

    if (title.includes(token)) {
      score += 10
    }
  }

  // 실제 검색어 또는 지역이 일치한 항목만 이미지 보너스를 줍니다.
  if (score > 0 && item?.firstimage) {
    score += 1
  }

  return score
}

function normalizeItem(item, category, language) {
  return {
    category,
    name: String(item?.title || '').trim(),
    location: addressOf(item, category, language),

    eventStartDate:
      category === '축제공연행사'
        ? String(item?.eventstartdate || '')
        : '',

    eventEndDate:
      category === '축제공연행사'
        ? String(item?.eventenddate || '')
        : '',

    eventPlace:
      category === '축제공연행사'
        ? String(item?.eventplace || '')
        : '',
  }
}

function evenly(items, limit) {
  if (items.length <= limit) {
    return items
  }

  return Array.from(
    { length: limit },
    (_, index) =>
      items[
        Math.round(
          (index * (items.length - 1)) /
            Math.max(1, limit - 1),
        )
      ],
  )
}

function targetDatasets(question, preference) {
  const explicit = explicitDatasets(question)

  if (explicit.length) {
    return explicit
  }

  if (preference.types.length) {
    return preference.types
      .map((type) =>
        DATASETS.find(
          (dataset) => dataset.type === type,
        ),
      )
      .filter(Boolean)
  }

  return DATASETS
}

async function candidatesFor(question, language) {
  const district = detectDistrict(question)
  const preference = preferenceContext(question)
  const datasets = targetDatasets(
    question,
    preference,
  )

  const tokens = [
    ...new Set([
      ...tokensOf(question),
      ...preference.tokens,
    ]),
  ]

  const broadRequest = isPlaceQuestion(question)

  const groups = await Promise.all(
    datasets.map(async (dataset) => {
      const items = await loadItems(
        dataset,
        language,
      )

      const valid = items.filter((item) => {
        if (
          !String(item?.title || '').trim() ||
          !addressOf(
            item,
            dataset.type,
            language,
          )
        ) {
          return false
        }

        if (
          district &&
          !searchableText(
            item,
            dataset.type,
          ).includes(district.toLowerCase())
        ) {
          return false
        }

        return true
      })

      const scored = valid
        .map((item, index) => ({
          item,
          index,
          score: scoreItem(
            item,
            dataset.type,
            tokens,
            district,
          ),
        }))
        .filter(({ score }) => score > 0)
        .sort(
          (first, second) =>
            second.score - first.score ||
            first.index - second.index,
        )

      const limit =
        datasets.length === 1 ? 24 : 6

      const selected = scored.length
        ? scored
            .slice(0, limit)
            .map(({ item }) => item)
        : broadRequest
          ? evenly(valid, limit)
          : []

      return selected.map((item) =>
        normalizeItem(
          item,
          dataset.type,
          language,
        ),
      )
    }),
  )

  const unique = []
  const names = new Set()

  for (const item of groups.flat()) {
    const key = item.name
      .replace(/\s+/g, ' ')
      .toLowerCase()

    if (!key || names.has(key)) {
      continue
    }

    names.add(key)
    unique.push(item)

    if (unique.length >= 30) {
      break
    }
  }

  return unique
}

function outputText(data) {
  if (
    typeof data?.output_text === 'string' &&
    data.output_text.trim()
  ) {
    return data.output_text.trim()
  }

  if (!Array.isArray(data?.output)) {
    return ''
  }

  return data.output
    .flatMap((item) =>
      Array.isArray(item?.content)
        ? item.content
        : [],
    )
    .filter(
      (item) =>
        item?.type === 'output_text' &&
        typeof item.text === 'string',
    )
    .map((item) => item.text)
    .join('\n')
    .trim()
}

function parseResult(raw) {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  const parse = (value) => {
    try {
      const result = JSON.parse(value)

      if (
        typeof result?.status === 'string' &&
        typeof result?.answer === 'string'
      ) {
        return {
          status: result.status,
          answer: result.answer.trim(),
        }
      }

      return null
    } catch {
      return null
    }
  }

  const direct = parse(cleaned)

  if (direct) {
    return direct
  }

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')

  return start >= 0 && end > start
    ? parse(cleaned.slice(start, end + 1))
    : null
}

function instructions(language) {
  if (lang(language) === 'en') {
    return `You are the LocalHub assistant. Answer only from supplied Seoul place candidates.

- A natural request such as "I want somewhere lively" is a recommendation request.
- Treat lively as atmosphere, never as verified live crowd data.
- A rainy-day place request is supported.
- Prefer indoor candidates, but never claim today's weather.
- Use unsupported_data for live weather, temperature, air quality, current crowds, traffic, opening status, waiting time, reservations, vacancies, current prices, reviews, news, finance, translation, calculations, or programming.
- Use no_match only when the request is supported but no supplied candidate fits.
- Recommend up to three different places only from the candidate JSON.
- Copy names and locations exactly.
- Never invent popularity, reviews, facilities, hours, prices, weather, crowd levels, or availability.
- Write naturally.
- Include name, category, location, and one cautious reason for each place.

Return only JSON:
{
  "status": "recommendation" | "unsupported_data" | "no_match",
  "answer": "complete answer"
}`
  }

  return `당신은 제공된 서울 지역정보 후보만 사용해 답변하는 LocalHub 도우미입니다.

- "사람 많은데 가고 싶어", "활기찬 곳에 가고 싶어"는 장소 추천 요청입니다.
- 원하는 분위기로만 해석하고 현재 실제 혼잡하다고 말하지 마세요.
- "비 오는 날 갈 곳"은 추천 요청입니다.
- 실내 후보를 우선하되 현재 날씨를 안다고 말하지 마세요.
- 실시간 날씨, 기온, 미세먼지, 현재 혼잡도, 교통, 영업 여부, 대기시간, 예약, 빈방, 현재 가격, 후기, 뉴스, 금융, 번역, 계산, 코딩은 unsupported_data입니다.
- 장소 요청은 맞지만 후보가 없을 때만 no_match를 사용하세요.
- 후보 JSON에 있는 서로 다른 장소만 최대 3곳 추천하세요.
- 장소명과 위치는 JSON 값을 그대로 사용하세요.
- 인기, 후기, 시설, 운영시간, 가격, 날씨, 혼잡도, 예약 가능 여부를 만들지 마세요.
- 자연스럽게 답변하세요.
- 각 장소에 이름, 유형, 위치, 짧고 조심스러운 추천 이유를 포함하세요.

반드시 아래 형식의 JSON만 출력하세요.
{
  "status": "recommendation" | "unsupported_data" | "no_match",
  "answer": "사용자에게 보여줄 전체 답변"
}`
}

function fallback(candidates, language) {
  const selected = candidates.slice(0, 3)

  if (!selected.length) {
    return pickText(
      language,
      '조건에 맞는 장소를 찾지 못했어요.',
      'No matching place was found.',
    )
  }

  const header = pickText(
    language,
    '요청하신 조건과 가까운 장소를 LocalHub 데이터에서 찾아봤어요.',
    'I found these LocalHub places that are close to your request.',
  )

  const body = selected
    .map((item, index) => {
      if (lang(language) === 'en') {
        return `${index + 1}. ${item.name}
- Category: ${item.category}
- Location: ${item.location}`
      }

      return `${index + 1}. ${item.name}
- 유형: ${item.category}
- 위치: ${item.location}`
    })
    .join('\n\n')

  return `${header}\n\n${body}`
}

function grounded(answer, candidates) {
  const lower = String(answer || '').toLowerCase()

  const count = candidates.filter((item) =>
    lower.includes(item.name.toLowerCase()),
  ).length

  return count >= Math.min(2, candidates.length)
}

async function askOpenAI(
  question,
  candidates,
  language,
) {
  if (!API_KEY) {
    throw new Error(
      pickText(
        language,
        'OpenAI API 키가 없습니다. .env 파일을 확인해 주세요.',
        'The OpenAI API key is missing.',
      ),
    )
  }

  const response = await fetch(API_URL, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },

    body: JSON.stringify({
      model: MODEL,

      instructions: instructions(language),

      input: `${
        lang(language) === 'en'
          ? 'User question'
          : '사용자 질문'
      }:
${question}

${
  lang(language) === 'en'
    ? 'Candidate JSON data'
    : '후보 JSON 데이터'
}:
${JSON.stringify(candidates, null, 2)}`,

      max_output_tokens: 1200,
      store: false,
    }),
  })

  if (!response.ok) {
    let message = pickText(
      language,
      `OpenAI API 요청 실패: ${response.status}`,
      `OpenAI API request failed: ${response.status}`,
    )

    try {
      const data = await response.json()

      message =
        data?.error?.message || message
    } catch {
      // JSON 형식이 아닌 오류라면 기본 오류 메시지를 사용합니다.
    }

    throw new Error(message)
  }

  const raw = outputText(
    await response.json(),
  )

  if (!raw) {
    throw new Error(
      pickText(
        language,
        'OpenAI 응답에서 답변을 찾지 못했습니다.',
        'No answer was found in the OpenAI response.',
      ),
    )
  }

  const result = parseResult(raw)

  if (
    !result ||
    ![
      'recommendation',
      'unsupported_data',
      'no_match',
    ].includes(result.status)
  ) {
    return {
      status: 'recommendation',
      answer: fallback(
        candidates,
        language,
      ),
    }
  }

  if (
    result.status === 'recommendation' &&
    !grounded(result.answer, candidates)
  ) {
    return {
      status: 'recommendation',
      answer: fallback(
        candidates,
        language,
      ),
    }
  }

  return result
}

export async function askRegionQuestion(
  question,
  language = 'ko',
) {
  const selectedLanguage = lang(language)
  const text = String(question || '').trim()

  if (!text) {
    return {
      status: 'error',
      error: 'empty_question',

      text: pickText(
        selectedLanguage,
        '질문을 입력해 주세요.',
        'Enter a question.',
      ),
    }
  }

  if (FOOD.test(text)) {
    return {
      status: 'no_data_category',

      text: pickText(
        selectedLanguage,
        `현재 음식점 데이터는 제공하지 않습니다.
관광지, 문화시설, 축제, 레포츠, 쇼핑, 숙박 또는 여행코스를 질문해 주세요.`,
        `Restaurant data is not currently available.
Ask about attractions, cultural facilities, festivals, leisure, shopping, accommodation, or travel courses.`,
      ),
    }
  }

  const unsupported =
    unsupportedTopic(text)

  if (unsupported) {
    return {
      status: 'unsupported_data',
      error: unsupported,

      text: unsupportedMessage(
        unsupported,
        selectedLanguage,
      ),
    }
  }

  if (!isPlaceQuestion(text)) {
    return {
      status: 'unsupported_data',
      error: 'general',

      text: unsupportedMessage(
        'general',
        selectedLanguage,
      ),
    }
  }

  try {
    const candidates =
      await candidatesFor(
        text,
        selectedLanguage,
      )

    if (!candidates.length) {
      return {
        status: 'no_candidates',

        text: pickText(
          selectedLanguage,
          `제공된 서울 지역정보 데이터에서 조건에 맞는 장소를 찾지 못했어요. 지역구나 카테고리를 조금 더 구체적으로 입력해 주세요.
예: 종로구 박물관, 강남구 숙소, 비 오는 날 갈 만한 실내 장소`,
          'No matching place was found. Try adding a district or category.',
        ),
      }
    }

    const result = await askOpenAI(
      text,
      candidates,
      selectedLanguage,
    )

    if (
      result.status ===
      'unsupported_data'
    ) {
      return {
        status: 'unsupported_data',
        text: result.answer,
      }
    }

    if (result.status === 'no_match') {
      return {
        status: 'no_candidates',
        text: result.answer,
      }
    }

    return {
      status: 'openai_ok',
      text: result.answer,
    }
  } catch (error) {
    return {
      status: 'openai_error',

      error:
        error instanceof Error
          ? error.message
          : String(error),

      text: pickText(
        selectedLanguage,
        '추천 정보를 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        'An error occurred while loading recommendations. Please try again later.',
      ),
    }
  }
}
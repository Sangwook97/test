const API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-5-mini'
const API_URL = 'https://api.openai.com/v1/responses'

const DATASETS = [
  ['관광지', '서울_관광지.json'],
  ['문화시설', '서울_문화시설.json'],
  ['축제공연행사', '서울_축제공연행사.json'],
  ['레포츠', '서울_레포츠.json'],
  ['쇼핑', '서울_쇼핑.json'],
  ['숙박', '서울_숙박.json'],
  ['여행코스', '서울_여행코스.json'],
].map(([type, file]) => ({ type, file }))

const CATEGORY_TYPES = DATASETS.map(({ type }) => type)
const CACHE = new Map()

const ANALYSIS_SCHEMA = {
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
    ranking_instruction: {
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
    'ranking_instruction',
    'limitation',
    'answer',
  ],
}

const SELECTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: {
      type: 'string',
      enum: ['recommendation', 'no_match'],
    },
    intro: {
      type: 'string',
    },
    selected: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: {
            type: 'string',
          },
          reason: {
            type: 'string',
          },
        },
        required: ['id', 'reason'],
      },
    },
    closing: {
      type: 'string',
    },
  },
  required: ['status', 'intro', 'selected', 'closing'],
}

const isEnglish = (language) => language === 'en'

const message = (language, koreanText, englishText) => {
  return isEnglish(language) ? englishText : koreanText
}

function currentDate() {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(now.getDate()).padStart(2, '0')}`
}

function normalizeDate(value) {
  const digits = String(value || '').replace(/\D/g, '')

  return /^\d{8}$/.test(digits) ? digits : ''
}

function normalizeDistrict(value) {
  const district = String(value || '').trim()

  return district && !district.endsWith('구')
    ? `${district}구`
    : district
}

function createAddress(item, category, language) {
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
    return message(
      language,
      '서울특별시 (세부 주소 정보 없음)',
      'Seoul (detailed address unavailable)',
    )
  }

  return ''
}

function extractDistrict(address) {
  return (
    String(address || '').match(
      /서울(?:특별시)?\s+([가-힣]+구)/,
    )?.[1] || ''
  )
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
    item?.playtime,
    item?.usetimefestival,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function normalizeItem(item, category, language) {
  const location = createAddress(
    item,
    category,
    language,
  )

  const result = {
    category,
    name: String(item?.title || '').trim(),
    location,
    district: extractDistrict(location),
  }

  if (category === '축제공연행사') {
    result.eventStartDate = String(
      item?.eventstartdate || '',
    )

    result.eventEndDate = String(
      item?.eventenddate || '',
    )
  }

  return result
}

async function loadDataset(dataset, language) {
  if (CACHE.has(dataset.file)) {
    return CACHE.get(dataset.file)
  }

  const response = await fetch(
    `/data/${dataset.file}`,
  )

  if (!response.ok) {
    throw new Error(
      message(
        language,
        `${dataset.file} 파일을 불러오지 못했습니다. (${response.status})`,
        `Could not load ${dataset.file}. (${response.status})`,
      ),
    )
  }

  const data = await response.json()

  if (!Array.isArray(data?.items)) {
    throw new Error(
      message(
        language,
        `${dataset.file}에서 items 배열을 찾지 못했습니다.`,
        `No items array was found in ${dataset.file}.`,
      ),
    )
  }

  const loaded = {
    items: data.items,
  }

  CACHE.set(dataset.file, loaded)

  return loaded
}

function supportsReasoning(model) {
  return /^(gpt-5|o1|o3|o4)/i.test(
    String(model || ''),
  )
}

function extractOutputText(data) {
  if (
    data?.output_parsed &&
    typeof data.output_parsed === 'object'
  ) {
    return JSON.stringify(data.output_parsed)
  }

  if (
    typeof data?.output_text === 'string' &&
    data.output_text.trim()
  ) {
    return data.output_text.trim()
  }

  if (!Array.isArray(data?.output)) {
    return ''
  }

  const parts = []

  for (const output of data.output) {
    if (typeof output?.text === 'string') {
      parts.push(output.text)
    }

    if (!Array.isArray(output?.content)) {
      continue
    }

    for (const content of output.content) {
      if (typeof content?.text === 'string') {
        parts.push(content.text)
      } else if (
        typeof content?.text?.value === 'string'
      ) {
        parts.push(content.text.value)
      } else if (
        typeof content?.output_text === 'string'
      ) {
        parts.push(content.output_text)
      }
    }
  }

  return parts
    .filter(Boolean)
    .join('\n')
    .trim()
}

function extractRefusal(data) {
  if (!Array.isArray(data?.output)) {
    return ''
  }

  for (const output of data.output) {
    if (!Array.isArray(output?.content)) {
      continue
    }

    for (const content of output.content) {
      if (
        content?.type === 'refusal' &&
        typeof content.refusal === 'string'
      ) {
        return content.refusal.trim()
      }
    }
  }

  return ''
}

function parseJson(text) {
  const cleaned = String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')

    if (start < 0 || end <= start) {
      return null
    }

    try {
      return JSON.parse(
        cleaned.slice(start, end + 1),
      )
    } catch {
      return null
    }
  }
}

async function callOpenAI({
  instructions,
  input,
  schemaName,
  schema,
  language,
  maxOutputTokens,
  strict,
}) {
  const body = {
    model: MODEL,
    instructions,
    input,
    max_output_tokens: maxOutputTokens,
    store: false,

    text: {
      format: strict
        ? {
            type: 'json_schema',
            name: schemaName,
            strict: true,
            schema,
          }
        : {
            type: 'json_object',
          },
    },
  }

  if (supportsReasoning(MODEL)) {
    body.reasoning = {
      effort: 'low',
    }
  }

  const response = await fetch(API_URL, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },

    body: JSON.stringify(body),
  })

  let data = null

  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const error = new Error(
      data?.error?.message ||
        message(
          language,
          `OpenAI API 요청에 실패했습니다. (${response.status})`,
          `OpenAI API request failed. (${response.status})`,
        ),
    )

    error.status = response.status

    throw error
  }

  const refusal = extractRefusal(data)

  if (refusal) {
    throw new Error(refusal)
  }

  const outputText = extractOutputText(data)

  if (!outputText) {
    console.error(
      '[LocalHub OpenAI empty response]',
      data,
    )

    throw new Error(
      data?.incomplete_details?.reason ||
        message(
          language,
          'OpenAI 응답에서 내용을 찾지 못했습니다.',
          'No content was found in the OpenAI response.',
        ),
    )
  }

  const parsed = parseJson(outputText)

  if (!parsed) {
    console.error(
      '[LocalHub OpenAI invalid JSON]',
      outputText,
    )

    throw new Error(
      message(
        language,
        'OpenAI 응답을 JSON으로 해석하지 못했습니다.',
        'The OpenAI response could not be parsed as JSON.',
      ),
    )
  }

  return parsed
}

async function requestJson({
  instructions,
  input,
  schemaName,
  schema,
  language,
  maxOutputTokens,
}) {
  if (!API_KEY) {
    throw new Error(
      message(
        language,
        'OpenAI API 키가 없습니다. .env와 Netlify 환경변수를 확인해 주세요.',
        'The OpenAI API key is missing. Check .env and Netlify variables.',
      ),
    )
  }

  try {
    return await callOpenAI({
      instructions,
      input,
      schemaName,
      schema,
      language,
      maxOutputTokens,
      strict: true,
    })
  } catch (firstError) {
    const status = Number(
      firstError?.status || 0,
    )

    if ([401, 403, 429].includes(status)) {
      throw firstError
    }

    console.warn(
      '[LocalHub structured output retry]',
      firstError,
    )

    return callOpenAI({
      instructions: `${instructions}

반드시 마크다운 없이 JSON 객체 하나만 출력하세요.
다음 스키마를 따르세요:
${JSON.stringify(schema)}`,

      input,
      schemaName,
      schema,
      language,
      maxOutputTokens:
        maxOutputTokens + 1200,
      strict: false,
    })
  }
}

function analysisInstructions(language) {
  return `
당신은 서울 지역정보 챗봇 LocalHub의 자연어 요청 분석기입니다.

사용자의 언어는 ${
    isEnglish(language)
      ? '영어'
      : '한국어'
  }입니다.

답변도 같은 언어로 작성하세요.

단어 하나만 보고 차단하지 말고 문장 전체 의미를 이해하세요.

오늘 날짜는 ${currentDate()}입니다.

LocalHub 카테고리:
${CATEGORY_TYPES.join(', ')}

LocalHub 데이터에 있는 정보:
- 정확한 장소명
- 카테고리
- 서울 주소
- 축제의 시작일과 종료일

중요한 처리 규칙:

1. "사람 많은 데로 가고 싶어", "유명한 곳", "핫플", "활기찬 곳"은 현재 혼잡도 조회가 아니라 분위기와 일반적인 인지도를 원하는 장소 추천입니다.

- action="search"
- 관광지, 쇼핑, 축제공연행사 등 적절한 categories 선택
- ranking_instruction에 후보 목록 안에서만 일반적인 대중 인지도를 이용해 유명하고 활기찬 장소를 선별하라고 작성
- limitation에 실시간 혼잡도는 확인할 수 없다고 자연스럽게 작성

2. "지금 사람이 가장 많은 곳", "현재 혼잡도", "실시간 방문객 수"는 action="unsupported"입니다.

3. "비 오는 날 갈 곳"은 장소 추천이므로 search이고, "오늘 비가 와?"는 실시간 날씨 질문이므로 unsupported입니다.

4. 데이트 장소, 가족과 갈 곳, 조용한 곳, 사진 찍기 좋은 곳도 후보 장소명 사이의 일반적인 인지도를 이용해 조심스럽게 추천할 수 있습니다.

5. 후보 데이터로 직접 검증할 수 없는 내용을 실시간 또는 확정 사실처럼 말하면 안 됩니다.

데이터에 없는 정보:
- 실시간 날씨
- 현재 혼잡도
- 방문객 수
- 교통
- 영업 여부
- 예약
- 빈방
- 현재 가격
- 후기
- 평점
- 정확한 인기 순위
- 음식점
- 뉴스
- 금융
- 번역
- 계산
- 코딩

search일 때:

- categories: 정확한 카테고리 1개 이상
- district: 정확한 서울 자치구명 또는 빈 문자열
- search_terms: 사용자가 직접 말한 장소명, 지역명, 구체적 검색어
- 넓은 분위기 요청이면 search_terms는 빈 배열 가능
- date_start와 date_end: YYYYMMDD 또는 빈 문자열
- ranking_instruction: 후보에서 최대 3곳을 고르는 자연어 기준
- limitation: 직접 확인할 수 없는 조건에 대한 자연스러운 주의 문구
- answer: 빈 문자열

unsupported 또는 clarify일 때:

- 검색 관련 값은 모두 비우기
- answer에 사용자에게 바로 보여줄 자연스러운 완성 답변 작성

반드시 JSON만 출력하세요.
`.trim()
}

async function analyzeQuestion(
  question,
  language,
) {
  return requestJson({
    instructions:
      analysisInstructions(language),

    input: `사용자 질문:
${question}`,

    schemaName: 'localhub_analysis',
    schema: ANALYSIS_SCHEMA,
    language,
    maxOutputTokens: 2800,
  })
}

function cleanAnalysis(raw) {
  const action = [
    'search',
    'unsupported',
    'clarify',
  ].includes(raw?.action)
    ? raw.action
    : 'clarify'

  const categories = Array.isArray(
    raw?.categories,
  )
    ? [...new Set(raw.categories)].filter(
        (category) =>
          CATEGORY_TYPES.includes(
            category,
          ),
      )
    : []

  return {
    action,

    categories:
      action === 'search' &&
      categories.length
        ? categories
        : [],

    district: normalizeDistrict(
      raw?.district,
    ),

    searchTerms: Array.isArray(
      raw?.search_terms,
    )
      ? [
          ...new Set(
            raw.search_terms,
          ),
        ]
          .map((term) =>
            String(term || '').trim(),
          )
          .filter(Boolean)
          .slice(0, 16)
      : [],

    dateStart: normalizeDate(
      raw?.date_start,
    ),

    dateEnd: normalizeDate(
      raw?.date_end,
    ),

    rankingInstruction: String(
      raw?.ranking_instruction || '',
    ).trim(),

    limitation: String(
      raw?.limitation || '',
    ).trim(),

    answer: String(
      raw?.answer || '',
    ).trim(),
  }
}

function festivalOverlaps(
  item,
  start,
  end,
) {
  if (!start && !end) {
    return true
  }

  const itemStart = normalizeDate(
    item?.eventstartdate,
  )

  const itemEnd =
    normalizeDate(
      item?.eventenddate,
    ) || itemStart

  const requestedStart =
    start || end

  const requestedEnd =
    end || start

  return Boolean(
    itemStart &&
      itemEnd &&
      itemStart <= requestedEnd &&
      itemEnd >= requestedStart,
  )
}

function calculateScore(
  item,
  category,
  analysis,
) {
  const text = searchableText(
    item,
    category,
  )

  const title = String(
    item?.title || '',
  ).toLowerCase()

  let score = 0

  if (analysis.district) {
    if (
      !text.includes(
        analysis.district.toLowerCase(),
      )
    ) {
      return -1
    }

    score += 50
  }

  if (
    category ===
    '축제공연행사'
  ) {
    if (
      !festivalOverlaps(
        item,
        analysis.dateStart,
        analysis.dateEnd,
      )
    ) {
      return -1
    }

    if (
      analysis.dateStart ||
      analysis.dateEnd
    ) {
      score += 40
    }
  }

  for (
    const term of
    analysis.searchTerms
  ) {
    const normalizedTerm =
      term.toLowerCase()

    if (
      text.includes(
        normalizedTerm,
      )
    ) {
      score += 8
    }

    if (
      title.includes(
        normalizedTerm,
      )
    ) {
      score += 18
    }
  }

  if (
    score > 0 &&
    item?.firstimage
  ) {
    score += 1
  }

  return score
}

function sampleEvenly(
  items,
  limit,
) {
  if (items.length <= limit) {
    return items
  }

  return Array.from(
    { length: limit },
    (_, index) => {
      const position = Math.round(
        (index *
          (items.length - 1)) /
          Math.max(
            1,
            limit - 1,
          ),
      )

      return items[position]
    },
  )
}

async function createCatalog(
  analysis,
  language,
) {
  const categories =
    analysis.categories.length
      ? analysis.categories
      : CATEGORY_TYPES

  const groups =
    await Promise.all(
      categories.map(
        async (category) => {
          const dataset =
            DATASETS.find(
              (item) =>
                item.type ===
                category,
            )

          if (!dataset) {
            return []
          }

          const loaded =
            await loadDataset(
              dataset,
              language,
            )

          const records =
            loaded.items
              .map(
                (
                  item,
                  index,
                ) => ({
                  item: normalizeItem(
                    item,
                    category,
                    language,
                  ),

                  index,

                  score:
                    calculateScore(
                      item,
                      category,
                      analysis,
                    ),
                }),
              )
              .filter(
                ({
                  item,
                  score,
                }) =>
                  score >= 0 &&
                  item.name &&
                  item.location,
              )
              .sort(
                (
                  first,
                  second,
                ) =>
                  second.score !==
                  first.score
                    ? second.score -
                      first.score
                    : first.index -
                      second.index,
              )

          const matched =
            records.filter(
              ({ score }) =>
                score > 0,
            )

          return matched.length
            ? matched.slice(
                0,
                500,
              )
            : records
        },
      ),
    )

  const unique = []
  const used = new Set()

  for (
    const record of
    groups.flat()
  ) {
    const key =
      `${record.item.category}|${record.item.name}`
        .replace(
          /\s+/g,
          ' ',
        )
        .toLowerCase()

    if (used.has(key)) {
      continue
    }

    used.add(key)
    unique.push(record.item)
  }

  return sampleEvenly(
    unique,
    7000,
  ).map(
    (item, index) => ({
      id: `p${index + 1}`,
      ...item,
    }),
  )
}

function selectionInstructions(
  language,
) {
  return `
당신은 LocalHub 후보 목록에서 사용자의 자연어 의도에 맞는 장소를 고르는 AI입니다.

사용자의 언어는 ${
    isEnglish(language)
      ? '영어'
      : '한국어'
  }이며 답변도 같은 언어로 작성하세요.

규칙:

1. 선택 장소는 반드시 후보 목록의 정확한 ID여야 합니다. 목록 밖 장소를 추가하지 마세요.

2. 최대 3곳을 선택하세요.

3. "사람 많은 데", "유명한 곳", "핫플", "활기찬 곳"처럼 현재·지금·실시간을 묻지 않는 요청은 후보 장소명 가운데 일반적으로 널리 알려지고 활기찬 분위기로 인식되는 곳을 우선하세요.

4. 일반적인 대중 인지도를 이용해 후보끼리 비교할 수 있지만 현재 실제 혼잡하다고 단정하면 안 됩니다.

5. 사용자의 분석 결과에 있는 rankingInstruction과 limitation을 반영하세요.

6. 날씨, 현재 혼잡도, 방문객 수, 영업시간, 가격, 예약, 후기, 평점, 주차, 편의시설을 만들지 마세요.

7. 각 장소의 reason은 사용자의 질문에 맞게 자연스럽고 짧게 작성하세요.

8. 적절한 후보가 없으면 status="no_match", selected=[]로 반환하세요.

9. 반드시 JSON만 출력하세요.
`.trim()
}

async function selectCandidates(
  question,
  analysis,
  catalog,
  language,
) {
  const catalogText = catalog
    .map(
      ({
        id,
        category,
        name,
        district,
      }) =>
        [
          id,
          category,
          name,
          district || '-',
        ].join('\t'),
    )
    .join('\n')

  return requestJson({
    instructions:
      selectionInstructions(
        language,
      ),

    input: `사용자 질문:
${question}

자연어 분석:
${JSON.stringify(
  analysis,
  null,
  2,
)}

후보 형식:
ID | 카테고리 | 장소명 | 자치구

후보 목록:
${catalogText}`,

    schemaName:
      'localhub_selection',

    schema: SELECTION_SCHEMA,
    language,
    maxOutputTokens: 3400,
  })
}

function cleanSelection(
  raw,
  catalog,
) {
  const candidateMap =
    new Map(
      catalog.map(
        (candidate) => [
          candidate.id,
          candidate,
        ],
      ),
    )

  const selected = []
  const used = new Set()

  for (
    const value of
    Array.isArray(
      raw?.selected,
    )
      ? raw.selected
      : []
  ) {
    const id = String(
      value?.id || '',
    ).trim()

    if (
      !candidateMap.has(id) ||
      used.has(id)
    ) {
      continue
    }

    used.add(id)

    selected.push({
      place:
        candidateMap.get(id),

      reason: String(
        value?.reason || '',
      ).trim(),
    })

    if (
      selected.length >= 3
    ) {
      break
    }
  }

  return {
    status:
      raw?.status ===
        'recommendation' &&
      selected.length
        ? 'recommendation'
        : 'no_match',

    intro: String(
      raw?.intro || '',
    ).trim(),

    selected,

    closing: String(
      raw?.closing || '',
    ).trim(),
  }
}

function formatFestivalDate(
  place,
  language,
) {
  if (
    place.category !==
    '축제공연행사'
  ) {
    return ''
  }

  const start =
    normalizeDate(
      place.eventStartDate,
    )

  const end =
    normalizeDate(
      place.eventEndDate,
    )

  if (!start && !end) {
    return ''
  }

  const format = (value) =>
    /^\d{8}$/.test(value)
      ? `${value.slice(
          0,
          4,
        )}.${value.slice(
          4,
          6,
        )}.${value.slice(
          6,
          8,
        )}`
      : value

  const period =
    !end || start === end
      ? format(start)
      : `${format(
          start,
        )} ~ ${format(end)}`

  return message(
    language,
    `- 일정: ${period}`,
    `- Dates: ${period}`,
  )
}

function buildAnswer(
  selection,
  analysis,
  language,
) {
  if (
    selection.status !==
    'recommendation'
  ) {
    return {
      status:
        'no_candidates',

      text:
        selection.intro ||
        message(
          language,
          'LocalHub 후보 중에서 조건에 맞는 장소를 확실하게 고르기 어려웠어요. 지역구나 장소 유형을 조금 더 구체적으로 알려주세요.',
          'I could not confidently choose a matching place. Please add a district or place type.',
        ),
    }
  }

  const intro =
    selection.intro ||
    message(
      language,
      '요청하신 분위기에 맞춰 LocalHub 데이터에서 다음 장소를 골라봤어요.',
      'I selected these places from the LocalHub data for your request.',
    )

  const items =
    selection.selected
      .map(
        (
          {
            place,
            reason,
          },
          index,
        ) =>
          [
            `${index + 1}. ${place.name}`,

            message(
              language,
              `- 유형: ${place.category}`,
              `- Category: ${place.category}`,
            ),

            message(
              language,
              `- 위치: ${place.location}`,
              `- Location: ${place.location}`,
            ),

            formatFestivalDate(
              place,
              language,
            ),

            message(
              language,
              `- 추천 이유: ${
                reason ||
                '요청하신 분위기와 비교적 잘 맞는 후보입니다.'
              }`,
              `- Why: ${
                reason ||
                'This candidate broadly matches your request.'
              }`,
            ),
          ]
            .filter(Boolean)
            .join('\n'),
      )
      .join('\n\n')

  const ending = [
    analysis.limitation,
    selection.closing,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    status: 'openai_ok',

    text: [
      intro,
      items,
      ending,
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim(),
  }
}

export async function askRegionQuestion(
  question,
  language = 'ko',
) {
  const selectedLanguage =
    isEnglish(language)
      ? 'en'
      : 'ko'

  const originalQuestion =
    String(
      question || '',
    ).trim()

  if (!originalQuestion) {
    return {
      status: 'error',
      error:
        'empty_question',

      text: message(
        selectedLanguage,
        '질문을 입력해 주세요.',
        'Enter a question.',
      ),
    }
  }

  try {
    const analysis =
      cleanAnalysis(
        await analyzeQuestion(
          originalQuestion,
          selectedLanguage,
        ),
      )

    if (
      analysis.action ===
        'unsupported' ||
      analysis.action ===
        'clarify'
    ) {
      return {
        status: 'openai_ok',

        text:
          analysis.answer ||
          message(
            selectedLanguage,
            '현재 LocalHub 데이터로는 정확히 답하기 어려워요. 서울의 관광지, 문화시설, 축제, 레포츠, 쇼핑, 숙박 또는 여행코스를 자연스럽게 질문해 주세요.',
            'This cannot be answered accurately with the current LocalHub data. Ask naturally about Seoul places.',
          ),
      }
    }

    const catalog =
      await createCatalog(
        analysis,
        selectedLanguage,
      )

    if (!catalog.length) {
      return {
        status:
          'no_candidates',

        text: message(
          selectedLanguage,
          'LocalHub 데이터에서 조건에 맞는 후보를 찾지 못했어요. 지역구나 장소 유형을 조금 더 구체적으로 알려주세요.',
          'No matching candidate was found. Please add a district or place type.',
        ),
      }
    }

    const selection =
      cleanSelection(
        await selectCandidates(
          originalQuestion,
          analysis,
          catalog,
          selectedLanguage,
        ),

        catalog,
      )

    return buildAnswer(
      selection,
      analysis,
      selectedLanguage,
    )
  } catch (error) {
    console.error(
      '[LocalHub chatbot error]',
      error,
    )

    return {
      status:
        'openai_error',

      error:
        error instanceof Error
          ? error.message
          : String(error),

      text: message(
        selectedLanguage,
        '추천을 만드는 중 일시적인 오류가 발생했어요. 잠시 후 다시 질문해 주세요.',
        'A temporary error occurred while creating the recommendation. Please try again.',
      ),
    }
  }
}
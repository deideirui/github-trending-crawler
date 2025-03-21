const path = require('node:path')
const { writeFile: write } = require('node:fs/promises')

const cheerio = require('cheerio')
const dayjs = require('dayjs')
const { io, takeEvery } = require('little-saga')

const got = (url) => fetch(url).then((r) => r.text())

const parse = (html) => {
  const by = cheerio.load(html)

  const rows = by('article.Box-row')
  const l = rows.length

  const res = []

  for (let i = 0; i < l; i++) {
    const box = rows.eq(i)
    const name = box.find('.lh-condensed a')
    const desc = box.find('p.col-9.my-1.pr-4')

    const t1 = box.find('span[itemprop=programmingLanguage]').text().trim() || '-'
    const t2 = box.find('.mt-2 .octicon-star').parent().not('.float-sm-right').text().trim() || '-'
    const t3 = box.find('.mt-2 .octicon-repo-forked').parent().text().trim() || '-'
    const t4 = ''
    const t5 = box.find('.float-sm-right').text().trim() || '-'

    /** @type [string, string, string[]] */
    const arr
      // name
      = [ name.attr('href')
      // description
      , desc.text().trim() || '-'
      // [language, stars, forked, built by, stars today?]
      , [t1, t2, t3, t4, t5]
      ]

    res.push([
      `- name: ${arr[0].replace(/^\//, '')}`,
      `  url: https://github.com${arr[0]}`,
      `  description: ${arr[1]}`,
      `  language: ${arr[2][0]}`,
      `  stars: ${arr[2][1]}`,
      `  forked: ${arr[2][2]}`,
      `  stars today: ${(r => r ? r[0] : 0)(arr[2][4].match(/\d+(,\d+)?/))}`,
    ])
  }

  return res
}

const topics = (html) => {
  const by = cheerio.load(html)
  // 0: select spoken language, 1: select languages, 2: date range,
  const els = by('.select-menu-header').eq(1).parent().find('.select-menu-item')

  const topics = []

  for (let i = 0; i < els.length; i++) {
    const el = els.eq(i)

    topics.push([el.text().trim(), (url => url[0] === '/' ? 'https://github.com' + url : url)(el.attr('href'))])
  }

  return topics
}

const save = async (file, arr) => {
  await write(path.resolve(__dirname, file), arr.map(x => x.join('\n') + '\n').join('\n'))
}

const runTrendingTask = async (html) => {
  const arr = parse(html)

  // YYYY-MM-DD HH:mm:ss
  await save('./db/' + dayjs().format('YYYY-MM-DD') + '-Trending.yaml', arr)

  console.log('[trending] ✅')
}

const runLanguageTask = async (lang, url) => {
  if (url == null) {
    throw Error('Language Not Found: ' + lang)
  }

  const res = await got(url)

  const arr = parse(res)

  await save('./db/' + dayjs().format('YYYY-MM-DD') + '-' + lang + '.yaml', arr)

  console.log('[language] ' + lang + ' ✅')
}

function* trending(html) {
  yield io.take('Task<Trending>')
  yield io.call(runTrendingTask, html)
}

function* languages () {
  yield takeEvery('Task<Language>', function* ({ payload }) {
    yield io.call(runLanguageTask, payload[0], payload[1])
  })
}

function* run () {
  const res = yield io.call(got, 'https://github.com/trending')

  yield io.all([
    io.call(write, path.resolve(__dirname, './sample.txt'), res),
    io.fork(trending, res),
    io.fork(languages)
  ])

  yield io.put({ type: 'Task<Trending>' })

  const langs = topics(res)

  const M = langs.reduce((acc, x) => ({ ...acc, [x[0]]: x[1] }), {})

  const arr = ['Haskell', 'Scala', 'Python', 'Java', 'Go', 'Rust', 'JavaScript', 'TypeScript']

  for (let x of arr) {
    yield io.put({ type: 'Task<Language>', payload: [x, M[x]] })
  }
}

module.exports = {
  parse,
  topics,
  run,
}

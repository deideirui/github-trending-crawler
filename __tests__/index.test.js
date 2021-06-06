const path = require('path')
const { readFileSync: read } = require('fs')

const { parse, topics } = require('../lib')

const html = () => {
  return read(path.join(__dirname, '../sample.txt'))
}

test('parse should work', () => {
  const res = parse(html())

  expect(res.length > 0).toBe(true)

  const check = (i, fn) => {
    return res.map(x => fn(x[i]))
  }

  // name
  expect(check(0, x => x).length > 0).toBe(true)
  // description
  expect(check(1, x => x && x !== '-').length > 0).toBe(true)
  // language
  expect(check(2, x => x && x !== 'language: -').length > 0).toBe(true)
  // stars
  expect(check(3, x => x && x !== 'stars: -').length > 0).toBe(true)
  // forked
  expect(check(4, x => x && x !== 'forked: -').length > 0).toBe(true)
  // stars today
  expect(check(5, x => x && x !== 'stars today: -').length > 0).toBe(true)
})

test('topics should work', () => {
  const res = topics(html())

  // languages
  expect(res.length).toBeGreaterThan(10)
})

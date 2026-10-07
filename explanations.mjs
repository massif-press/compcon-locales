#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'

const API = 'https://hosted.weblate.org/api/'
const FILE = new URL('./explanations.json', import.meta.url)
const apply = process.argv.includes('--apply')
const pull = process.argv.includes('--pull')

const token =
  process.env.WLC_TOKEN ??
  readFileSync(`${homedir()}/.config/weblate`, 'utf8').match(
    /^https:\/\/hosted\.weblate\.org\/api\/\s*=\s*(\S+)/m
  )?.[1]
if (!token) throw new Error('no Weblate token in $WLC_TOKEN or ~/.config/weblate')

async function api(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${url}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function units(path) {
  const out = []
  for (let url = `${API}${path}`; url; ) {
    const page = await api(url)
    out.push(...page.results)
    url = page.next
  }
  return out
}

const byKey = (a, b) => (a[0] < b[0] ? -1 : 1)
const file = JSON.parse(readFileSync(FILE, 'utf8'))

const explained = await units(
  `units/?page_size=1000&q=${encodeURIComponent('project:compcon AND language:en AND has:explanation')}`
)
for (const unit of explained) {
  const component = unit.translation.split('/').at(-3)
  if (file[component]?.[unit.context] !== undefined) continue
  console.log(`${component}: ${pull ? 'pulled' : 'only on Weblate'} ${unit.context}`)
  if (pull) (file[component] ??= {})[unit.context] = unit.explanation
}
if (pull) {
  const sorted = Object.entries(file)
    .sort(byKey)
    .map(([component, keys]) => [component, Object.fromEntries(Object.entries(keys).sort(byKey))])
  writeFileSync(FILE, JSON.stringify(Object.fromEntries(sorted), null, 4) + '\n')
}

let changes = 0
for (const [component, wanted] of Object.entries(file)) {
  const live = new Map(
    (await units(`translations/compcon/${component}/en/units/?page_size=1000`)).map(unit => [unit.context, unit])
  )
  for (const [key, explanation] of Object.entries(wanted)) {
    const unit = live.get(key)
    if (!unit) console.log(`${component}: no string for ${key}`)
    else if (unit.explanation !== explanation) {
      changes++
      console.log(`${component}: ${apply ? 'set' : 'would set'} ${key}`)
      if (apply) await api(`${API}units/${unit.id}/`, { method: 'PATCH', body: JSON.stringify({ explanation }) })
    }
  }
}
console.log(`${changes} ${apply ? 'set' : 'to set (dry run, pass --apply)'}`)

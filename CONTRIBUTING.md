# Translating COMP/CON

Thank you for helping localize COMP/CON! All translation happens in [**Weblate**](https://hosted.weblate.org/engage/compcon/). You should not edit JSON files in this repo by hand. This guide covers the rules that keep translations from breaking the app.

PRs to this repo should only be made for:

- **Requests for new languages.**
- editing of this readme or other guidance documents.

## Where to translate

Go to the COMP/CON project on Hosted Weblate and pick a language. Weblate gives you the source English, a place for your translation, suggestions, and automatic checks. If a check fails, fix it before submitting as failing strings are not merged.

## Guidelines

### 1. String Interpolation

Strings can contain `{param}` placeholder tokens the app replaces at runtime:

> `Deleted {name}` -> German: `{name} gelöscht`

- Keep the **same key** and **single braces**: `{name}`, not `{{name}}`, `{ name }`, or `{Name}`.
- You may move a placeholder to fit your language's word order. You may not rename, translate,
  duplicate, or drop it.
- `{count}` / `{n}` are numbers; never replace them with a written-out number.

### 2. Plurals

Weblate shows one field per plural form your language needs (for example `one` / `few` / `many` / `other` in Russian, only `other` in Korean), each labeled with sample counts. Fill every field; the count goes in as `{count}` or `{n}`.

When plural support was switched on, existing translations were copied into `one` and `other`, and any extra forms (`few`, `many`, `zero`, `two`) were left empty. Those strings show as untranslated until the missing forms are filled in. Until then the app uses your `other` form for those counts.

### 3. Linked messages

`@:{'common.appName'}` inserts another string (here, the app name). Copy the whole token, braces and quotes included, exactly as it appears in the English. Do not translate or re-space the key inside it. You may move the token to fit your word order.

### 4. Markup

Game data descriptions may contain `<br>`, `<b>`, `<i>`, `<p>`, `mdi-abc`, and `cc:abc` markup. Translate
the text, never the tags or icon names. The markup check will flag a dropped or malformed tag.

### 5. Tone

COMP/CON is a diegetic assistant for mech pilots and translations should strive to maintain that sense wherever it does not directly interfere with game rules text. Where your language has a register choice, prefer a concise, slightly formal/military tone over casual. Consistency within a locale matters more than any single choice, so please try to follow what earlier translators establish.

### 6. Punctuation and framing

- Don't add a trailing `:` to a label unless the English has one. The app adds its own colons after labels, so an extra one shows up doubled.
- Don't add `//`, `[ ]`, quotes or ALL CAPS for style.
- Do keep sentence punctuation (full stop, question mark, `…`) and adapt it to your language's typography (French spacing before `:` `?` `!`, full-width `：` in CJK).
- In-world form text such as `RM-4-01 // full name or primary alias` is authored that way: keep form codes (`RM-4-01`, `MV-2//c`, `NDAP/SR-01`) and their `//` unchanged, translate the words.

### 7. Context

Every string's key (for example `nav.achievements.hiddenCount`) says which part of the app it belongs to: `pm` pilot management, `gm` GM tools, `active` Active Mode, `combat` combat rules text and the combat log, `mainMenu`, `compendium`, `nav` navigation and options, `ui` shared components, `common` / `stats` / `enums` shared vocabulary. Check the explanation panel and any screenshot attached to a string before translating a short or ambiguous word. If a single word could be read two ways (Roll, Save, Free, Condition), ask in the string's comments.

## Do NOT translate

These stay in English everywhere:

- **Brand / product names:** LANCER, COMP/CON, Massif Press.
- **Manufacturers / factions:** GMS, IPS-N, SSC, HORUS, HA, and other in-world organization names need to maintain their abbreviations as they're used as keys. Full names (eg. "Harrison Armory") can be provided in a parenthetical.
- **`Lancer Core Book`** and other LCP / content-pack identity names are keys, not prose.
- **HORUS chat / bootlog flavor text** are authored art, deliberately untranslated.
- Anything inside `{...}`, `@:...`, or `<...>` (see rules above).

## Glossary

Recurring LANCER terms should map to **one** agreed word per language. The **Weblate glossary**
lists about 230 of them (stats, statuses and conditions, actions, tags, weapon and system types,
damage and range types), each with an explanation of its game meaning. Where a word is also an
everyday UI word (Save, Mount, Hide, Search, Size, Free, Full), the explanation says so; the UI
sense has its own key and is not bound by the glossary.

Many targets were pre-filled from the existing translations of the rules content (lancer-data)
and of the app. Correct them in the glossary if your team has settled on a different word. Terms
marked read-only (brand and manufacturer names) stay in English.

Keep stat abbreviations (HULL, AGI, SYS, ENG, HP, SP, E-DEF) consistent and recognizable; consider keeping them in English if appropriate, since they appear on stat blocks.

## Adding a new language

Request it in Weblate (or ask a maintainer). New languages may be seeded with machine translation marked **"needs review"**, Review and correct those before they count toward completeness. Nothing machine-translated is auto-approved.

## Questions

Open an issue on this repo or ask in the COMP/CON community channels.

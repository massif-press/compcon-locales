# Translating COMP/CON

Thank you for helping localize COMP/CON! All translation happens in **Weblate**. You should not
edit JSON files in this repo by hand. This guide covers the rules that keep translations from
breaking the app.

PRs to this repo should only be made for editing of this readme or other guidance documents.

## Where to translate

Go to the COMP/CON project on Hosted Weblate and pick a language (or request a new one). Weblate
gives you the source English, a place for your translation, suggestions, and automatic checks. If a
check fails, fix it before submitting. Failing strings are not merged.

## Guidelines

### 1. String Interpolation

Strings can contain `{param}` placeholder tokens the app replaces at runtime:

> `Deleted {name}` -> German: `{name} gelöscht`

- Keep the **same name** and **single braces**: `{name}`, not `{{name}}`, `{ name }`, or `{Name}`.
- You may **move** a placeholder to fit your language's word order. You may not rename, translate,
  duplicate, or drop it.
- `{count}` / `{n}` are numbers; never replace them with a written-out number.

### 2. Plurals

Plural strings separate forms with `|`:

> `1 pilot | {n} pilots`

Translate each form and keep the `|`. Weblate shows the correct number of forms for your language.

### 3. Linked messages

`@:common.cancel` references another string. Leave the `@:key` or `@key.x.y.z` address token as-is; do not translate the key.

### 4. Markup

Game data descriptions may contain `<br>`, `<b>`, `<i>`, `<p>`, `mdi-abc`, and `cc:abc` markup. Translate
the **text**, never the tags or icon names. The markup check will flag a dropped or malformed tag.

### 5. Tone

COMP/CON is a diagetic assistant for mech pilots and translations should strive to maintain that sense wherever it does not directly interfere with game rules text. Where your language has a register choice, prefer a concise, slightly formal/military tone over casual. Consistency within a locale matters more
than any single choice, so please try to follow what earlier translators establish.

## Do NOT translate

These stay in English everywhere:

- **Brand / product names:** LANCER, COMP/CON, Massif Press.
- **Manufacturers / factions:** GMS, IPS-N, SSC, HORUS, HA, and other in-world organization names need to maintain their abbreviations as they're used as keys. Full names (eg. "Harrison Armory") should be provided in a parenthetical.
- **`Lancer Core Book`** and other LCP / content-pack identity names are keys, not prose.
- **HORUS chat / bootlog flavor text** are authored art, deliberately untranslated.
- Anything inside `{...}`, `@:...`, or `<...>` (see rules above).

## Glossary

Recurring LANCER terms should map to **one** agreed word per language. Add your language's
choice to the **Weblate glossary** so it auto-suggests everywhere.

Keep stat abbreviations (HULL, AGI, SYS, ENG, HP, SP, E-DEF) consistent and recognizable; consider keeping them in English if appropriate, since they appear on stat blocks.

## Adding a new language

Request it in Weblate (or ask a maintainer). New languages may be seeded with machine translation
marked **"needs review"**, Review and correct those before they count toward completeness. Nothing
machine-translated is auto-approved.

## Questions

Open an issue on this repo or ask in the COMP/CON community channels.

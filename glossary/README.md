# COMP/CON glossary seed

`en.csv` is the English base of the **Weblate glossary component** for the COMP/CON
project. It is maintainer-seeded, not something translators edit by hand. Once the
component is wired, the glossary auto-suggests agreed terms while translating;
Weblate writes each language's terms back as a sibling `<lang>.csv`.

## File format

**Bilingual CSV** (`source,target,developer_comments`), the Weblate **"CSV file"**
format. Only columns Weblate's CSV parser recognizes are used:

- `source` — the English term (glossary key).
- `target` — the term in this file's language. In `en.csv` it equals `source`
  (the English rendering). A new `<lang>.csv` is seeded from this template, then the
  translator overwrites each `target`.
- `developer_comments` — context shown to translators, including the homograph
  cautions (e.g. SAVE the stat vs Save the action) and a read-only reminder on brand
  rows.

> Do **not** add `explanation` / `flags` columns: the CSV parser does not recognize
> them (it would silently misalign rows). Read-only status and explanations are set
> in the Weblate UI, not via CSV columns.

## Two kinds of term

- **Brand / manufacturer / content-pack names** (the first 9 rows: LANCER, COMP/CON,
  Massif Press, GMS, IPS-N, SSC, HORUS, HA, Lancer Core Book) — do-not-translate.
  After import, **mark these read-only in Weblate** (the comment on each row is a
  reminder); the CSV cannot carry that flag.
- **Recurring LANCER terms** (the rest: Pilot, Mech, Frame, ...) — the words this
  repo's string audit flagged as **context-variable** (homographs and inflecting
  status words). They stay as distinct keys in the app; consistency comes from this
  glossary, not from merging keys.

## How to wire the component

Repo-backed (shares this repo via Weblate "from existing component"), so the seed
round-trips through git:

1. In the COMP/CON Weblate project: **Add component -> from existing component ->
   `compcon/ui`** (reuses this repo).
2. **File format:** `CSV file` (bilingual) · **Filemask:** `glossary/*.csv` ·
   **Source language:** English. Leave **Monolingual base file** EMPTY (the files are
   bilingual). Set **Template for new translations:** `glossary/en.csv`.
3. Check **"Use as glossary."**
4. After the strings import, mark the 9 brand rows **read-only** in Weblate, then
   translators fill each language's term; Weblate commits `glossary/<lang>.csv`.

Add new recurring terms in `en.csv` or directly in Weblate; this file is just the
starting seed.

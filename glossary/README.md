# COMP/CON glossary seed

`en.csv` is the English base of the **Weblate glossary component** for the COMP/CON
project. It is maintainer-seeded, not something translators edit by hand. Once the
component is wired, the glossary auto-suggests agreed terms while translating and
locks the do-not-translate terms; Weblate writes each language's terms back as a
sibling `<lang>.csv`.

## What is in it

| flag          | meaning                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `read-only`   | Brand / manufacturer / content-pack identity names. Weblate shows them but blocks edits. `target` = source. |
| `terminology` | Recurring LANCER terms that must map to **one** agreed word per language. `target` is left blank so each language fills its own. The `explanation` carries context, including the homograph cautions (e.g. SAVE the stat vs Save the action). |

The `terminology` rows are deliberately the words this repo's string audit flagged
as **context-variable** (homographs and inflecting status words). They stay as
distinct keys in the app; consistency comes from this glossary, not from merging
keys.

## How to wire the component

Created as a repo-backed component (shares this repo via Weblate "from existing
component"), so the seed round-trips through git rather than a one-off upload:

1. In the COMP/CON Weblate project: **Add component -> from existing component ->
   `compcon/ui`** (reuses this repo).
2. **File format:** CSV · **Filemask:** `glossary/*.csv` · **Monolingual base file:**
   `glossary/en.csv` · **Source language:** English.
3. Check **"Use as glossary."**
4. Confirm the `read-only` rows imported as locked, then translators add their
   language's term for each `terminology` row; Weblate commits `glossary/<lang>.csv`.

Add new recurring terms in `en.csv` or directly in Weblate; this file is just the
starting seed.

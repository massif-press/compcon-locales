# compcon-locales

[![Translation status](https://hosted.weblate.org/widget/compcon/multi-auto.svg)](https://hosted.weblate.org/engage/compcon/)

Translation catalogs for [COMP/CON](https://github.com/massif-press/compcon), the digital companion
for the LANCER TTRPG. This repo is **translation data**.

Translations are managed through **[Weblate](https://weblate.org/)**. You should not submit to this repo directly to translate. This repo is where Weblate stores its work and where the app reads finished translations from.

## Update Flow

1. **English is automatically generated.** `ui/en.json` is pushed from the app repo's CI whenever UI strings change. Content English is generated from `@massif/lancer-data`. **Base (English) files are read-only in Weblate**. Edits here are overwritten.
2. Weblate pulls new/changed English source strings and flags affected translations as "needs editing."
3. Translators work in Weblate.
4. Weblate commits translations back **as pull requests to the `weblate` branch**. Awaits maintainer review before merge to `master`.
5. On merge, catalogs publish to the CDN; the app picks up UI on its next deploy and content on its next fetch.

## Translating

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

[GPLv3](./LICENSE), matching COMP/CON. Translations contributed via Weblate are licensed under the
same terms.

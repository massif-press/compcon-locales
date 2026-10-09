# compcon-locales

[![Translation status](https://hosted.weblate.org/widget/compcon/multi-auto.svg)](https://hosted.weblate.org/engage/compcon/)

Translation catalogs for [COMP/CON](https://github.com/massif-press/compcon), the digital companion
for the LANCER TTRPG. This repo is **translation data**.

Translations are managed through **[Weblate](https://weblate.org/)**. You should not submit to this repo directly to translate. This repo is where Weblate stores its work and where the app reads finished translations from.

## Update Flow

1. **English is automatically generated.** `ui/en.json` arrives as an automated pull request (branch `automated/locales-sync`) opened by the app repo's CI whenever UI strings change on `dev`; merging that PR is what updates the English source in Weblate. Content English is generated from `@massif/lancer-data`.
2. Weblate pulls new/changed English source strings and flags affected translations as "needs editing."
3. Translators work in Weblate.
4. Weblate commits translations back as pull requests to the `weblate` branch.

## Translating

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## Translating third-party LCPs

Third party content packs are not translated here. Instead, a pack author or translator ships a language patch (`.llp`) that COMP/CON installs alongside the pack. [`build-lcp.mjs`](./build-lcp.mjs) generates these. COMP/CON CI keeps keys aligned:

```sh
curl -O https://raw.githubusercontent.com/massif-press/compcon-locales/master/build-lcp.mjs

# 1. extract every translatable string from an unpacked LCP (the folder containing lib/ or the *.json files)
node build-lcp.mjs extract ./my-lcp --lang fr --out my-pack.fr.llp

# 2. translate the values under "data" and fill in "translator"; leave the keys alone

# 3. distribute the .llp on its own, or add it to the .lcp so both install as one file
node build-lcp.mjs bundle my-pack.lcp my-pack.fr.llp
```

`extract` takes a directory, so packaged `.lcp` files must be first extracted. If you already have a flat `"<id>.<field>": "text"` JSON map, `node build-lcp.mjs pack fr.json --target <pack-id>` wraps it in a `.llp` header.

Users install a `.llp` from the same screen as a `.lcp`.

## License

[GPLv3](./LICENSE), matching COMP/CON. Translations contributed via Weblate are licensed under the same terms.

#!/usr/bin/env node
/*!
Build LCP language patches (.llp). Two modes:

  extract <lcp-dir> [--lang <code>] [--out <file>]
    Walk an unpacked LCP's JSON collections and emit an English base .llp holding every
    translatable key + its English source string. Copy it, change `lang`, translate the values.

  pack <flat.json> --target <pack-id> [--lang <code>] [--out <file>]
    Wrap an already-translated flat `<id>.<field>` map (like a Weblate content/<c>/<lang>.json)
    in a .llp header.

Keys match exactly what the localize() resolver reads, so authors don't need to guess paths.
*/

// scripts/build-llp.mjs
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// src/i18n/contentKeys.mjs
function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "x";
}
var ALLOWLIST = {
  actions: ["name", "terse", "detail", "trigger"],
  backgrounds: ["name", "description"],
  core_bonuses: ["name", "description", "effect", "mounted_effect"],
  environments: ["name", "description"],
  frames: ["name", "description"],
  manufacturers: ["name", "description", "quote"],
  mods: ["name", "description", "effect"],
  pilot_gear: ["name", "description", "effect"],
  reserves: ["name", "description"],
  sitreps: ["name", "description", "objective", "deployment", "controlZone", "extraction"],
  skills: ["name", "description", "detail"],
  statuses: ["name", "terse", "effects"],
  systems: ["name", "description", "effect"],
  tags: ["name", "description"],
  talents: ["name", "terse", "description"],
  weapons: ["name", "description", "effect"],
  downtime_actions: ["name", "terse", "detail"]
};
var ARRAY_CONTAINERS = {
  traits: "trait",
  ranks: "rank",
  profiles: "profile",
  actions: "action",
  active_actions: "active_action",
  passive_actions: "passive_action",
  active_effects: "active_effect",
  passive_effects: "passive_effect",
  deployables: "deployable",
  active_deployables: "active_deployable",
  synergies: "synergy",
  active_synergies: "active_synergy",
  passive_synergies: "passive_synergy",
  ammo: "ammo",
  add_special: "special",
  counters: "counter",
  active_counters: "counter"
};
var SINGLE_CONTAINERS = {
  core_system: "core_system",
  bonus_damage: "bonus_damage",
  table: "table"
};
var EFFECT_FIELDS = ["on_attack", "on_hit", "on_crit", "on_miss"];
var EMIT_FIELDS = [
  "name",
  "description",
  "terse",
  "detail",
  "effect",
  "trigger",
  "active_name",
  "active_effect",
  "passive_name",
  "passive_effect"
];
var fieldText = (v) => typeof v === "string" ? v : v && typeof v === "object" ? v.detail : void 0;
function nestedEntries(_collection, item) {
  const out = [];
  if (!item || item.id == null) return out;
  const emit = (obj, prefix) => {
    const fields = {};
    for (const f of EMIT_FIELDS) {
      const t = fieldText(obj[f]);
      if (t != null && String(t).trim()) fields[f] = t;
    }
    if (Object.keys(fields).length) out.push({ prefix, obj, fields });
  };
  const walk = (obj, prefix) => {
    for (const key in SINGLE_CONTAINERS) {
      const v = obj[key];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const p = `${prefix}.${SINGLE_CONTAINERS[key]}`;
        emit(v, p);
        walk(v, p);
      }
    }
    const seen = /* @__PURE__ */ new Map();
    for (const key in ARRAY_CONTAINERS) {
      const arr = obj[key];
      if (!Array.isArray(arr)) continue;
      arr.forEach((el, idx) => {
        if (!el || typeof el !== "object") return;
        let p;
        if (el.id != null) {
          p = String(el.id);
        } else {
          const base = el.name ? `${ARRAY_CONTAINERS[key]}_${slug(el.name)}` : `${ARRAY_CONTAINERS[key]}_${idx}`;
          const n = seen.get(base) || 0;
          seen.set(base, n + 1);
          p = `${prefix}.${n ? `${base}_${n + 1}` : base}`;
        }
        emit(el, p);
        walk(el, p);
      });
    }
    for (const key of EFFECT_FIELDS) {
      const v = obj[key];
      if (v == null) continue;
      const p = `${prefix}.${key}`;
      if (typeof v === "string") {
        if (v.trim()) out.push({ prefix: p, obj: null, fields: { detail: v } });
      } else if (typeof v === "object" && !Array.isArray(v)) {
        emit(v, p);
        walk(v, p);
      }
    }
  };
  walk(item, item.id);
  return out;
}
var HAS_MARKUP = /<[a-zA-Z/]/;
var BARE_AMP = /&(?!#\d+;|#x[0-9a-fA-F]+;|[a-zA-Z][a-zA-Z0-9]*;)/g;
var VOID_TAG = /<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b([^<>]*?)\s*\/?>/gi;
function normalizeMarkup(str) {
  const s = String(str);
  if (!HAS_MARKUP.test(s)) return s;
  return s.replace(BARE_AMP, "&amp;").replace(VOID_TAG, (_, tag, attrs) => `<${tag}${attrs}/>`);
}
var VOID_NAMES = new Set(
  "area base br col embed hr img input link meta param source track wbr".split(" ")
);
var TAG = /<(\/?)([a-zA-Z][\w-]*)([^<>]*?)(\/?)>/g;
function markupFault(str) {
  const s = String(str);
  if (!HAS_MARKUP.test(s)) return null;
  if (BARE_AMP.test(s)) {
    BARE_AMP.lastIndex = 0;
    return "bare & (not an entity)";
  }
  if (/<[^<>]*$/.test(s)) return "unterminated tag";
  const stack = [];
  let m;
  TAG.lastIndex = 0;
  while (m = TAG.exec(s)) {
    const [, close, name, , selfClose] = m;
    const tag = name.toLowerCase();
    if (VOID_NAMES.has(tag)) {
      if (!selfClose) return `<${tag}> not self-closed`;
      continue;
    }
    if (selfClose) continue;
    if (close) {
      if (!stack.length) return `stray </${tag}>`;
      const open = stack.pop();
      if (open !== tag) return `</${tag}> closes <${open}>`;
    } else stack.push(tag);
  }
  return stack.length ? `unclosed <${stack[stack.length - 1]}>` : null;
}

// scripts/build-llp.mjs
var ALIAS = { zh_Hans: "zh", pt_BR: "pt" };
var appLocale = (code) => ALIAS[code] ?? code;
var readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
function extractFromLcp(dir) {
  const libDir = existsSync(join(dir, "lib")) ? join(dir, "lib") : dir;
  const manifestPath = join(libDir, "lcp_manifest.json");
  const manifest = existsSync(manifestPath) ? readJson(manifestPath) : {};
  const data = {};
  for (const [collection, fields] of Object.entries(ALLOWLIST)) {
    const file = join(libDir, `${collection}.json`);
    if (!existsSync(file)) continue;
    const items = readJson(file);
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item?.id) continue;
      for (const field of fields) {
        const val = item[field];
        if (val == null || val === "") continue;
        const str = Array.isArray(val) ? val.join("\n") : typeof val === "object" ? val.detail ?? "" : String(val);
        if (str.trim()) data[`${item.id}.${field}`] = normalizeMarkup(str);
      }
      for (const { prefix, fields: nf } of nestedEntries(collection, item)) {
        for (const [field, val] of Object.entries(nf)) {
          const str = Array.isArray(val) ? val.join("\n") : String(val);
          if (str.trim()) data[`${prefix}.${field}`] = normalizeMarkup(str);
        }
      }
    }
  }
  return { manifest, data };
}
var sortKeys = (obj) => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
function makeLlp({ lang, target, version, data }) {
  return {
    lang,
    target,
    ...version ? { target_version: `>=${version}` } : {},
    translation_version: "0.1.0",
    last_update: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    translator: "",
    data: sortKeys(data)
  };
}
function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) flags[args[i].slice(2)] = args[++i];
    else positional.push(args[i]);
  }
  return { flags, positional };
}
async function main() {
  const [mode, ...rest] = process.argv.slice(2);
  const { flags, positional } = parseFlags(rest);
  if (mode === "extract") {
    const input = positional[0];
    if (!input || !existsSync(input) || !statSync(input).isDirectory()) {
      console.error("extract: pass an unpacked LCP directory (containing lib/ or the *.json files)");
      process.exit(1);
    }
    const { manifest, data } = extractFromLcp(input);
    const target = manifest.item_prefix || manifest.name || basename(resolve(input));
    const llp = makeLlp({
      lang: appLocale(flags.lang || "en"),
      target,
      version: manifest.version,
      data
    });
    const out = flags.out || `${target}.${llp.lang}.llp`;
    writeFileSync(out, JSON.stringify(llp, null, 2) + "\n");
    const faults = Object.entries(data).map(([k, v]) => [k, markupFault(v)]).filter(([, f]) => f);
    if (faults.length) {
      console.warn(`${faults.length} string(s) still unparseable as XML (fix in the pack source):`);
      for (const [k, f] of faults) console.warn(`  ${k}: ${f}`);
    }
    console.log(`extract: ${Object.keys(data).length} keys -> ${out}`);
    return;
  }
  if (mode === "pack") {
    const input = positional[0];
    if (!input || !existsSync(input)) {
      console.error('pack: pass a flat "<id>.<field>": "text" JSON file');
      process.exit(1);
    }
    const target = flags.target;
    if (!target) {
      console.error("pack: --target <pack-id> is required");
      process.exit(1);
    }
    const data = readJson(input);
    const lang = appLocale(flags.lang || basename(input).replace(/\.json$/, ""));
    const llp = makeLlp({ lang, target, version: flags.version, data });
    const out = flags.out || `${target}.${lang}.llp`;
    writeFileSync(out, JSON.stringify(llp, null, 2) + "\n");
    console.log(`pack: ${Object.keys(data).length} keys -> ${out}`);
    return;
  }
  if (mode === "bundle") {
    const [lcpPath, ...llpPaths] = positional;
    if (!lcpPath || !existsSync(lcpPath) || llpPaths.length === 0) {
      console.error("bundle: usage: bundle <file.lcp> <patch.llp> [more.llp ...] [--out <file>]");
      process.exit(1);
    }
    const JSZip = await import("jszip").then((m) => m.default).catch(() => {
      console.error("bundle: this mode needs jszip. run: npm i jszip");
      process.exit(1);
    });
    const zip = await JSZip.loadAsync(readFileSync(lcpPath));
    for (const p of llpPaths) {
      if (!existsSync(p)) {
        console.error(`bundle: missing ${p}`);
        process.exit(1);
      }
      zip.file(basename(p), readFileSync(p, "utf8"));
    }
    const out = flags.out || lcpPath;
    writeFileSync(out, await zip.generateAsync({ type: "nodebuffer" }));
    console.log(`bundle: added ${llpPaths.length} patch(es) -> ${out}`);
    return;
  }
  console.error(
    `usage: ${basename(process.argv[1])} extract <lcp-dir> | pack <flat.json> --target <id> | bundle <file.lcp> <patch.llp...>`
  );
  process.exit(1);
}
if (import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });

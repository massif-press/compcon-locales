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
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from "node:fs";
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
var LCP_FIELDS = {
  npc_classes: ["name", "flavor", "tactics", "terse"],
  npc_templates: ["name", "description", "tactics"],
  npc_features: ["name", "description", "effect", "trigger"],
  eidolon_layers: ["name", "appearance", "hints", "rules", "shard_detail"],
  eidolon_traits: ["name", "detail"]
};
function eidolonTraitId(name) {
  return `eidolon_trait_${slug(name)}`;
}
function bondPowerPrefix(origin, name) {
  return `${origin}.power_${slug(name)}`;
}
var BOND_POWER_FIELDS = ["name", "description", "frequency", "prerequisite"];
function bondPowerEntries(power, origin = power.origin) {
  return BOND_POWER_FIELDS.filter((f) => power[f] != null && String(power[f]).trim()).map((f) => [
    `${bondPowerPrefix(origin, power.name)}.${f}`,
    String(power[f])
  ]);
}
function bondEntries(bond) {
  const out = [];
  const add = (key, v) => {
    if (v != null && String(v).trim()) out.push([key, String(v)]);
  };
  add(`${bond.id}.name`, bond.name);
  bond.major_ideals?.forEach((v, i) => add(`${bond.id}.major_ideal_${i}`, v));
  bond.minor_ideals?.forEach((v, i) => add(`${bond.id}.minor_ideal_${i}`, v));
  bond.questions?.forEach((q, i) => {
    add(`${bond.id}.question_${i}`, q.question);
    q.options?.forEach((v, j) => add(`${bond.id}.question_${i}_option_${j}`, v));
  });
  for (const p of bond.powers ?? []) out.push(...bondPowerEntries(p, bond.id));
  return out;
}
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
  const emit = (obj, prefix, src = obj) => {
    const fields = {};
    for (const f of EMIT_FIELDS) {
      const t = fieldText(src[f]);
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
        const actionEffect = key.endsWith("actions") && !el.detail && el.effect;
        emit(el, p, actionEffect ? { ...el, detail: el.effect, effect: void 0 } : el);
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
var ATTRS = /^(\s+[A-Za-z_:][\w.:-]*\s*=\s*("[^"]*"|'[^']*'))*\s*$/;
function markupFault(str) {
  const s = String(str);
  if (!HAS_MARKUP.test(s)) return null;
  if (BARE_AMP.test(s)) {
    BARE_AMP.lastIndex = 0;
    return "bare & (not an entity)";
  }
  if (/<[^<>]*$/.test(s)) return "unterminated tag";
  if (s.replace(TAG, "").includes("<")) return "bare < (not a tag)";
  const stack = [];
  let m;
  TAG.lastIndex = 0;
  while (m = TAG.exec(s)) {
    const [, close, tag, attrs, selfClose] = m;
    if (!ATTRS.test(attrs) || close && (attrs.trim() || selfClose))
      return `<${close}${tag}> malformed attributes`;
    if (VOID_NAMES.has(tag.toLowerCase())) {
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

// src/classes/npc/eidolon/core_layer.json
var core_layer_default = {
  id: "el_core",
  name: "Core",
  rules: "The Eidolon\u2019s core has no shards. Any shards on the field when this layer is revealed are immediately vaporized, destroyed in the blink of an eye. Once the core is destroyed, the Eidolon is defeated.",
  features: [
    {
      id: "el_core_pulsing_core",
      name: "Pulsing Core",
      origin: "el_core",
      type: "Trait",
      effect: "This layer is Size 1/2 and has 1 HP.",
      bonuses: [
        {
          id: "size",
          val: 0.5,
          overwrite: true
        },
        {
          id: "hp",
          val: 1,
          overwrite: true
        }
      ]
    },
    {
      id: "el_core_anticausal_thought",
      name: "Anticausal Thought",
      origin: "el_core",
      type: "Weapon",
      attacks: 1,
      weapon_type: "Superheavy Memetic",
      attack_bonus: [2, 4, 6],
      accuracy: 2,
      damage: [
        {
          type: "Energy",
          val: [15, 20, 25]
        }
      ],
      range: [
        {
          type: "Line",
          val: 10
        }
      ]
    }
  ],
  shards: {
    count: 0,
    detail: "The Eidolon\u2019s core has no shards. Any shards on the field when this layer is revealed are immediately vaporized, destroyed in the blink of an eye."
  }
};

// src/classes/npc/eidolon/persistent_traits.json
var persistent_traits_default = [
  {
    name: "Layer Order",
    detail: "Only one of the Eidolon\u2019s layers is active at a time and only the active layer is a valid target that can take damage."
  },
  {
    name: "Metamorphosis",
    detail: "When the active layer reaches 0 HP, that layer is destroyed, evaporating from the field. The Eidolon and its shards clear all statuses and conditions, and all other effects targeting them immediately end (including GRAPPLE, etc). The Eidolon remains, occupying the same space and providing obstruction as a blurring, shifting image, but it and all its shards gain IMMUNITY to all damage and effects until the start of its next turn. At the start of that turn, a new layer manifests and any effects specific to that layer begin (including the creation of new shards, etc)."
  },
  {
    name: "Predictable",
    detail: "The Eidolon can take any actions available to an NPC (QUICK TECH, HIDE, etc.) but always performs any special actions available to its current layer first, if possible. Each layer profile presents a suggested order, but these are not mandatory. Unless stated otherwise, shards can only take a standard move."
  },
  {
    name: "Memetic Weapons",
    detail: "Eidolons have a new type of weapons: MEMETIC weapons. These weapons ignore engagement and do not affect allied characters, even if they are caught in their area of effect."
  },
  {
    name: "Bonus Activations",
    detail: "Each round, the Eidolon takes one turn for every two mech characters hostile to it in the combat, to a maximum of four turns. It regains spent reactions at the start of each of its turns, though 1/round effects only refresh on its first turn each round."
  },
  {
    name: "Ominous Hovering",
    detail: "The Eidolon and its shards can fly equal to their SPEED and hover, but never willingly move more than 1 space above the ground or any other surface. They never fall; if forced to land, they will always descend safely to the ground."
  },
  {
    name: "Incomprehensible",
    detail: "SCAN (and other abilities that reveal an NPCs statistics) provide no information about the Eidolon or its shards. Instead, characters that SCAN the Eidolon or try to reveal its statistics receive hints about the active layer\u2019s capabilities (listed in the layer profile under \u201CHints\u201D)."
  }
];

// scripts/build-llp.mjs
var ALIAS = { zh_Hans: "zh", pt_BR: "pt" };
var appLocale = (code) => ALIAS[code] ?? code;
var readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
function lcpCollections(libDir) {
  const files = readdirSync(libDir);
  const read = (f) => files.includes(f) ? readJson(join(libDir, f)) : [];
  const out = Object.fromEntries(Object.keys(LCP_FIELDS).map((k) => [k, []]));
  out.npc_classes.push(...read("npc_classes.json"));
  out.npc_templates.push(...read("npc_templates.json"));
  for (const f of files.filter(
    (f2) => f2.startsWith("npc_") && !f2.includes("classes") && !f2.includes("templates")
  ))
    out.npc_features.push(...read(f));
  for (const [prefix, head, collection] of [
    ["npcc_", "role", "npc_classes"],
    ["npct_", "template", "npc_templates"]
  ]) {
    for (const f of files.filter((f2) => f2.startsWith(prefix))) {
      const items = read(f);
      const main2 = items.find((x) => x?.[head]);
      if (!main2) {
        console.warn(`${f}: no element with "${head}", skipped`);
        continue;
      }
      out[collection].push(main2);
      out.npc_features.push(...items.filter((x) => x !== main2));
    }
  }
  const layers = read("eidolon_layers.json");
  if (layers.length) {
    for (const layer of [...layers, core_layer_default]) {
      out.eidolon_layers.push({ ...layer, shard_detail: layer.shards?.detail });
      out.npc_features.push(...layer.features ?? [], ...layer.shards?.features ?? []);
    }
    out.eidolon_traits = persistent_traits_default.map((t) => ({ ...t, id: eidolonTraitId(t.name) }));
  }
  out.npc_classes = out.npc_classes.map((c) => ({ ...c, ...c.info }));
  out.npc_features = out.npc_features.map(
    (f) => !f.effect && f.detail ? { ...f, effect: f.detail } : f
  );
  return { out, bonds: read("bonds.json"), bondPowers: read("bond_powers.json") };
}
function extractFromLcp(dir) {
  const libDir = existsSync(join(dir, "lib")) ? join(dir, "lib") : dir;
  const manifestPath = join(libDir, "lcp_manifest.json");
  const manifest = existsSync(manifestPath) ? readJson(manifestPath) : {};
  const data = {};
  const put = (key, val) => {
    const str = Array.isArray(val) ? val.join("\n") : String(val);
    if (str.trim()) data[key] = normalizeMarkup(str);
  };
  const collect = (collection, fields, items, nested = true) => {
    for (const item of items) {
      if (!item?.id) continue;
      for (const field of fields) {
        const val = item[field];
        if (val == null || val === "") continue;
        put(
          `${item.id}.${field}`,
          typeof val === "object" && !Array.isArray(val) ? val.detail ?? "" : val
        );
      }
      if (!nested) continue;
      for (const { prefix, fields: nf } of nestedEntries(collection, item))
        for (const [field, val] of Object.entries(nf)) put(`${prefix}.${field}`, val);
    }
  };
  for (const [collection, fields] of Object.entries(ALLOWLIST)) {
    const file = join(libDir, `${collection}.json`);
    if (!existsSync(file)) continue;
    const items = readJson(file);
    if (Array.isArray(items)) collect(collection, fields, items);
  }
  const { out, bonds, bondPowers } = lcpCollections(libDir);
  for (const [collection, fields] of Object.entries(LCP_FIELDS))
    collect(collection, fields, out[collection], collection.startsWith("npc_"));
  for (const [key, val] of bonds.flatMap(bondEntries)) put(key, val);
  for (const [key, val] of bondPowers.flatMap((p) => bondPowerEntries(p))) put(key, val);
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
    console.log(`extract: ${Object.keys(data).length} keys -> ${out}`);
    if (faults.length) {
      console.error(`${faults.length} string(s) still unparseable as XML (fix in the pack source):`);
      for (const [k, f] of faults) console.error(`  ${k}: ${f}`);
      process.exit(1);
    }
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

#!/usr/bin/env node
/**
 * Token lint — keeps raw design values out of the studio.
 * Ported (and trimmed) from the Lost Lantern reference app's scripts/check-tokens.mjs.
 *
 * Scope: every src/ under apps/ and packages/ (including packages/adapters/).
 * Tokens: packages/tokens/src/tokens.css is the only file allowed to hold raw CSS values;
 *         the package's TS files may export typed lengths (rules 2–4 skip the package).
 *
 * Rules
 *   1. Every `var(--cs-…)` used anywhere resolves to a token declared in tokens.css
 *      (element-scoped `--_locals` may be declared in the file that uses them).
 *   2. `--cs-p-*` primitives are referenced ONLY inside tokens.css.
 *   3. Outside tokens.css: no colour literals (hex / rgb / hsl / oklch / color-mix) and no
 *      length or time literals in CSS declarations or JSX inline styles. `0`, percentages,
 *      unitless numbers and `fr` are fine. A line containing `token-ok` is exempt (say why).
 *   4. JS/TSX: no string that manufactures a unit (`${n}px`, '1.1s').
 *
 * Exit 1 on any finding.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOT = new URL('../../..', import.meta.url).pathname;
const TOKENS = join(ROOT, 'packages/tokens/src/tokens.css');
/* The whole token package is the source of truth: its TS side may hold typed lengths. */
const TOKENS_PKG = join(ROOT, 'packages/tokens/src/');
const EXT = new Set(['.css', '.js', '.jsx', '.ts', '.tsx']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out-tsc', 'test-output']);

function walk(path, out = []) {
  const st = statSync(path);
  if (st.isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (!SKIP_DIRS.has(entry)) walk(join(path, entry), out);
    }
  } else if (EXT.has(extname(path))) out.push(path);
  return out;
}

function srcDirs(base) {
  if (!existsSync(base)) return [];
  const out = [];
  for (const entry of readdirSync(base)) {
    const dir = join(base, entry);
    if (!statSync(dir).isDirectory()) continue;
    if (existsSync(join(dir, 'src'))) out.push(join(dir, 'src'));
    else out.push(...srcDirs(dir)); // one level of grouping, e.g. packages/adapters/*
  }
  return out;
}

const files = [...srcDirs(join(ROOT, 'apps')), ...srcDirs(join(ROOT, 'packages'))].flatMap((d) => walk(d));
if (!existsSync(TOKENS)) {
  console.error(`token lint: ${relative(ROOT, TOKENS)} is missing`);
  process.exit(1);
}
const tokensSrc = readFileSync(TOKENS, 'utf8');

/* Rule 1 groundwork: every custom property tokens.css puts on the cascade.
   `@theme` blocks are excluded: Tailwind inlines those into utilities, so a
   `var(--color-x)` from a theme block may resolve to nothing at runtime. */
const cascadeSrc = tokensSrc.replace(/^@theme\b[^{\n]*\{[\s\S]*?\n\}/gm, '');
const declared = new Set();
for (const m of cascadeSrc.matchAll(/^\s*(--[\w-]+)\s*:/gm)) declared.add(m[1]);

const COLOR = /(#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(|\bcolor-mix\()/;
const LENGTH =
  /(?<![\w.-])(\d*\.?\d+)(px|rem|em|ms|s|deg|dvh|dvw|svh|svw|lvh|lvw|vmin|vmax|vh|vw|ch|ex|cqmin|cqmax|cqw|cqh|cqi|cqb|pt|pc|cm|mm|in|q)\b/g;
const UNIT_STRING =
  /(\$\{[^}]*\}|['"`]\s*-?\d*\.?\d+)(px|rem|em|ms|s|deg|dvh|dvw|svh|svw|lvh|lvw|vmin|vmax|vh|vw|ch|ex|cqmin|cqmax|cqw|cqh|cqi|cqb|pt|pc|cm|mm|in|q)\b/;

const findings = new Map();
const add = (file, line, msg) => {
  const key = relative(ROOT, file);
  if (!findings.has(key)) findings.set(key, []);
  findings.get(key).push(`${line}: ${msg}`);
};

let varRefs = 0;
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const isTokens = file === TOKENS || file.startsWith(TOKENS_PKG);
  const isCss = extname(file) === '.css';
  const locals = new Set([...src.matchAll(/(--_[\w-]+)\s*:/g)].map((m) => m[1]));
  let inComment = false;
  src.split('\n').forEach((raw, i) => {
    const n = i + 1;
    let line = raw;
    if (inComment) {
      const end = line.indexOf('*/');
      if (end === -1) return;
      line = line.slice(end + 2);
      inComment = false;
    }
    line = line.replace(/\/\*.*?\*\//g, '');
    const open = line.indexOf('/*');
    if (open !== -1) {
      inComment = true;
      line = line.slice(0, open);
    }
    if (!isCss) line = line.replace(/^\s*\/\/.*$/, '').replace(/^\s*\*.*$/, '');
    if (raw.includes('token-ok')) return;

    for (const m of line.matchAll(/var\(\s*(--[\w-]+)/g)) {
      varRefs += 1;
      if (!declared.has(m[1]) && !locals.has(m[1])) add(file, n, `undefined token ${m[1]}`);
    }
    if (isTokens) return;

    if (/--cs-p-[\w-]+/.test(line)) add(file, n, `primitive referenced outside tokens.css: ${line.trim()}`);

    const color = line.match(COLOR);
    if (color) add(file, n, `raw colour ${color[0]}… → use a --cs-* token`);

    const isStyleLine = isCss || /style=\{\{|^\s*[\w-]+:\s*['"`]?[\d.]/.test(line);
    if (isStyleLine && !/^\s*@media|^\s*@keyframes|^\s*\d+%/.test(line)) {
      for (const m of line.matchAll(LENGTH)) {
        if (m[1] === '0') continue;
        add(file, n, `raw length ${m[0]} → use a --cs-* token`);
      }
    }
    if (!isCss && UNIT_STRING.test(line)) {
      add(file, n, `unit-bearing string ${line.match(UNIT_STRING)[0].trim()} → derive it in CSS from a token`);
    }
  });
}

const total = [...findings.values()].reduce((a, b) => a + b.length, 0);
console.log(`token lint · ${files.length} files · ${declared.size} tokens declared · ${varRefs} var() references`);
for (const [file, list] of [...findings].sort()) {
  console.log(`\n${file} — ${list.length} finding${list.length === 1 ? '' : 's'}`);
  for (const f of list) console.log(`  ${f}`);
}
if (total) {
  console.log(`\n✖ ${total} finding${total === 1 ? '' : 's'} — rules in scripts/check-tokens.mjs`);
  process.exit(1);
}
console.log('✔ no raw values outside packages/tokens/src/tokens.css; every var() resolves');

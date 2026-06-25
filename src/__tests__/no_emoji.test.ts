import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// 项目硬性约定：源码里禁止任何 emoji / 装饰性符号，一律用美术资源或纯文本。
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{FE00}-\u{FE0F}]/u;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('no emoji in source', () => {
  it('整个 src 树不含 emoji', () => {
    const offenders: string[] = [];
    for (const file of walk('src')) {
      if (file.endsWith('no_emoji.test.ts')) continue;
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (EMOJI.test(line)) offenders.push(`${file}:${index + 1}  ${line.trim().slice(0, 60)}`);
        });
    }
    expect(offenders, `发现 emoji：\n${offenders.join('\n')}`).toEqual([]);
  });
});

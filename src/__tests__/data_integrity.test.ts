import { describe, expect, it } from 'vitest';
import { ITEM_MAP } from '../data/items';
import { CONTAINERS, LUGGAGE, BATCHES } from '../data/shop';
import { GIANTS } from '../data/giants';
import { ABSURDS } from '../data/absurd';
import { MISSIONS } from '../data/missions';
import { BLUEPRINTS } from '../data/blueprints';
import { REFINES } from '../data/refine';

/** 所有「会被当成掉落/合成产物」的 id 都必须在 ITEM_MAP 里，否则运行时取 undefined 必崩 */
function assertItem(id: string, where: string) {
  expect(ITEM_MAP[id], `${where} 引用了不存在的物品 id: ${id}`).toBeTruthy();
}

describe('数据完整性 — 所有引用的物品 id 都存在', () => {
  it('货柜 / 行李 / 巨型货 / 离谱货 的掉落池 id 都存在', () => {
    for (const c of CONTAINERS) c.pool.forEach((id) => assertItem(id, `货柜 ${c.id}`));
    for (const l of LUGGAGE) l.pool.forEach((id) => assertItem(id, `行李 ${l.id}`));
    for (const g of GIANTS) g.pool.forEach((id) => assertItem(id, `巨型货 ${g.id}`));
    for (const a of ABSURDS) a.pool.forEach((id) => assertItem(id, `离谱货 ${a.id}`));
  });

  it('远征 的掉落池 + 独有收藏 id 都存在', () => {
    for (const m of MISSIONS) {
      m.rewards.pool.forEach((id) => assertItem(id, `远征 ${m.id} pool`));
      assertItem(m.rewards.unique, `远征 ${m.id} unique`);
    }
  });

  it('图纸 的合成输入 id 都存在（产物为 device/tool/ordnance，不在 ITEM_MAP）', () => {
    for (const bp of BLUEPRINTS) {
      bp.inputs.forEach((inp) => assertItem(inp.item, `图纸 ${bp.id} input`));
    }
  });

  it('提炼配方 的输入与产物 id 都存在', () => {
    for (const r of REFINES) {
      r.inputs.forEach((inp) => assertItem(inp.item, `配方 ${r.id} input`));
      assertItem(r.output.item, `配方 ${r.id} output`);
    }
  });

  it('卖家对白结构完整（有名字、头像、至少一句话）', () => {
    const withSeller = [...CONTAINERS, ...LUGGAGE, ...GIANTS, ...ABSURDS, ...MISSIONS];
    for (const x of withSeller) {
      const s = (x as { seller?: { name: string; emoji: string; lines: string[] } }).seller;
      if (!s) continue;
      expect(s.name.length, `${(x as { id: string }).id} 卖家无名字`).toBeGreaterThan(0);
      expect(s.emoji.length, `${(x as { id: string }).id} 卖家无头像`).toBeGreaterThan(0);
      expect(s.lines.length, `${(x as { id: string }).id} 卖家无台词`).toBeGreaterThan(0);
    }
  });

  it('普通进货批次不带卖家（避免无意义弹窗）', () => {
    for (const b of BATCHES) {
      expect((b as { seller?: unknown }).seller, `批次 ${b.id} 不应有卖家`).toBeUndefined();
    }
  });
});

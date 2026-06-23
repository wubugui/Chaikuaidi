import { describe, expect, it } from 'vitest';
import { initialState } from '../state';
import { clickPowerBase, luck, quoteSlots } from '../compute';
import { rollItem } from '../systems/loot';
import { QUOTES } from '../../data/quotes';
import { mulberry32 } from '../../lib/rng';

describe('quotes as loot', () => {
  it('quote items can drop with luck over many rolls', () => {
    const rand = mulberry32(2024);
    let quotes = 0;
    for (let i = 0; i < 20000; i++) {
      if (rollItem({ luck: 2 }, rand).item.kind === 'quote') quotes++;
    }
    expect(quotes).toBeGreaterThan(0);
  });
});

describe('equipped quotes apply bonuses', () => {
  it('clickPower quote raises click power', () => {
    const d = initialState();
    const base = clickPowerBase(d);
    const handQuote = QUOTES.find((q) => q.quote?.type === 'clickPower')!;
    d.quotes.push(handQuote.id);
    d.equippedQuotes.push(handQuote.id);
    expect(clickPowerBase(d)).toBeGreaterThan(base);
    expect(clickPowerBase(d)).toBeCloseTo(base * (1 + handQuote.quote!.amount), 5);
  });

  it('luck quote raises luck', () => {
    const d = initialState();
    const luckQuote = QUOTES.find((q) => q.quote?.type === 'luck')!;
    d.quotes.push(luckQuote.id);
    d.equippedQuotes.push(luckQuote.id);
    expect(luck(d)).toBeCloseTo(luckQuote.quote!.amount, 5);
  });
});

describe('quote slots', () => {
  it('defaults to one slot and grows with prestige', () => {
    const d = initialState();
    expect(quoteSlots(d)).toBe(1);
    d.prestigeTree.quoteSlot = 3;
    expect(quoteSlots(d)).toBe(4);
  });
});

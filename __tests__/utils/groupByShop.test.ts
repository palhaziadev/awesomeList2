import { buildShopGroups } from '@/utils/groupByShop';
import { Shop, TodoItem } from '@/models/Todo';

function makeItem(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: 'i1',
    itemId: 'item1',
    itemName: 'Milk',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'u1',
    isDone: false,
    ...overrides,
  };
}

const shops: Shop[] = [
  { shopId: '1', shopName: 'Lidl' },
  { shopId: '2', shopName: 'Aldi' },
];

describe('buildShopGroups', () => {
  it('returns empty array for empty input', () => {
    expect(buildShopGroups([], shops)).toEqual([]);
  });

  it('groups items by shop in order of first appearance', () => {
    const items = [
      makeItem({ id: 'a', shopId: '2' }),
      makeItem({ id: 'b', shopId: '1' }),
      makeItem({ id: 'c', shopId: '2' }),
    ];
    const result = buildShopGroups(items, shops);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ shopId: '2', shopName: 'Aldi', items: [items[0], items[2]] });
    expect(result[1]).toMatchObject({ shopId: '1', shopName: 'Lidl', items: [items[1]] });
  });

  it('puts items with no shopId into Other at the bottom', () => {
    const items = [
      makeItem({ id: 'a', shopId: '1' }),
      makeItem({ id: 'b', shopId: undefined }),
    ];
    const result = buildShopGroups(items, shops);
    expect(result).toHaveLength(2);
    expect(result[0].shopName).toBe('Lidl');
    expect(result[1]).toMatchObject({ shopId: null, shopName: 'Other', items: [items[1]] });
  });

  it('puts items with unknown shopId into Other', () => {
    const items = [makeItem({ id: 'a', shopId: '99' })];
    const result = buildShopGroups(items, shops);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ shopId: null, shopName: 'Other' });
  });

  it('omits Other group when all items have a valid shop', () => {
    const items = [makeItem({ id: 'a', shopId: '1' })];
    const result = buildShopGroups(items, shops);
    expect(result).toHaveLength(1);
    expect(result[0].shopName).toBe('Lidl');
  });

  it('returns only Other when shops array is empty', () => {
    const items = [makeItem({ id: 'a', shopId: '1' })];
    const result = buildShopGroups(items, []);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ shopId: null, shopName: 'Other' });
  });

  it('puts items with empty string shopId into Other', () => {
    const items = [makeItem({ id: 'a', shopId: '' })];
    const result = buildShopGroups(items, shops);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ shopId: null, shopName: 'Other' });
  });
});

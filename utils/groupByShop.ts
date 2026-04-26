import { Shop, TodoItem } from '@/models/Todo';

export type ShopGroup = {
  shopId: string | null;
  shopName: string;
  items: TodoItem[];
};

export function buildShopGroups(items: TodoItem[], shops: Shop[]): ShopGroup[] {
  const shopMap = new Map(shops.map((s) => [s.shopId, s.shopName]));
  const namedGroups = new Map<string, TodoItem[]>();
  const namedOrder: string[] = [];
  const noShopItems: TodoItem[] = [];

  for (const item of items) {
    if (item.shopId && shopMap.has(item.shopId)) {
      if (!namedGroups.has(item.shopId)) {
        namedGroups.set(item.shopId, []);
        namedOrder.push(item.shopId);
      }
      namedGroups.get(item.shopId)!.push(item);
    } else {
      noShopItems.push(item);
    }
  }

  const result: ShopGroup[] = namedOrder.map((shopId) => ({
    shopId,
    shopName: shopMap.get(shopId)!,
    items: namedGroups.get(shopId)!,
  }));

  if (noShopItems.length > 0) {
    result.push({ shopId: null, shopName: 'Other', items: noShopItems });
  }

  return result;
}

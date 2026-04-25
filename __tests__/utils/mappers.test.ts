import { mapRowToTodoItem } from '@/utils/mappers';

const baseRow = {
  id: 'list-item-1',
  item_id: 'todo-item-1',
  created_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
  is_done: false,
};

describe('mapRowToTodoItem', () => {
  it('maps shop_id to shopId', () => {
    const result = mapRowToTodoItem({ ...baseRow, shop_id: 'shop-1' }, 'Apple');
    expect(result.shopId).toBe('shop-1');
  });

  it('sets shopId to undefined when shop_id is null', () => {
    const result = mapRowToTodoItem({ ...baseRow, shop_id: null }, 'Apple');
    expect(result.shopId).toBeUndefined();
  });

  it('sets shopId to undefined when shop_id is absent', () => {
    const result = mapRowToTodoItem(baseRow, 'Apple');
    expect(result.shopId).toBeUndefined();
  });

  it('maps fourth argument to translationOverride', () => {
    const result = mapRowToTodoItem(baseRow, 'Apple', 'Manzana', 'Manzana verde');
    expect(result.translationOverride).toBe('Manzana verde');
  });

  it('sets translationOverride to undefined when not provided', () => {
    const result = mapRowToTodoItem(baseRow, 'Apple', 'Manzana');
    expect(result.translationOverride).toBeUndefined();
  });

  it('sets translationOverride to undefined when passed undefined', () => {
    const result = mapRowToTodoItem(baseRow, 'Apple', 'Manzana', undefined);
    expect(result.translationOverride).toBeUndefined();
  });
});

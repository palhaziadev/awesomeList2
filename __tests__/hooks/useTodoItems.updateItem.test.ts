import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useTodoItems } from '@/hooks/useTodoItems';
import { supabase } from '@/lib/supabase.config';

jest.mock('@/lib/supabase.config', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
    realtime: { setAuth: jest.fn().mockResolvedValue(undefined) },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  },
}));

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: jest.fn((cb: () => () => void) => {
      React.useEffect(cb, []);
    }),
  };
});

const mockFrom = supabase.from as jest.Mock;
const mockGetUser = supabase.auth.getUser as jest.Mock;

const sampleRow = {
  id: 'list-item-1',
  item_id: 'todo-item-1',
  created_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
  is_done: false,
  shop_id: null,
  todo_items: { name: 'Apple', translation: 'Manzana', translation_override: null },
};

function buildFromMock(
  fetchData: typeof sampleRow[],
  updateTodoItemsResult = { error: null },
  updateListItemsResult = { error: null },
) {
  const eqFetch = jest.fn().mockResolvedValue({ data: fetchData, error: null });
  const selectFetch = jest.fn().mockReturnValue({ eq: eqFetch });

  const eqUpdateTodoItems = jest.fn().mockResolvedValue(updateTodoItemsResult);
  const updateTodoItems = jest.fn().mockReturnValue({ eq: eqUpdateTodoItems });

  const eqUpdateListItems = jest.fn().mockResolvedValue(updateListItemsResult);
  const updateListItems = jest.fn().mockReturnValue({ eq: eqUpdateListItems });

  mockFrom.mockImplementation((table: string) => {
    if (table === 'todo_list_items') return { select: selectFetch, update: updateListItems };
    if (table === 'todo_items') return { update: updateTodoItems };
    return {};
  });

  return { eqFetch, selectFetch, updateTodoItems, eqUpdateTodoItems, updateListItems, eqUpdateListItems };
}

describe('useTodoItems — updateItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  it('optimistically updates translationOverride and shopId in state', async () => {
    buildFromMock([sampleRow]);
    const { result } = renderHook(() => useTodoItems('list-1'));

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.updateItem('list-item-1', {
        translationOverride: 'Manzana verde',
        shopId: 'shop-1',
      });
    });

    expect(result.current.items[0].translationOverride).toBe('Manzana verde');
    expect(result.current.items[0].shopId).toBe('shop-1');
  });

  it('updates todo_items.translation_override with item_id', async () => {
    const { updateTodoItems, eqUpdateTodoItems } = buildFromMock([sampleRow]);
    const { result } = renderHook(() => useTodoItems('list-1'));

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.updateItem('list-item-1', {
        translationOverride: 'override',
        shopId: null,
      });
    });

    expect(updateTodoItems).toHaveBeenCalledWith({ translation_override: 'override' });
    expect(eqUpdateTodoItems).toHaveBeenCalledWith('id', 'todo-item-1');
  });

  it('updates todo_list_items.shop_id with list item id', async () => {
    const { updateListItems, eqUpdateListItems } = buildFromMock([sampleRow]);
    const { result } = renderHook(() => useTodoItems('list-1'));

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.updateItem('list-item-1', {
        translationOverride: null,
        shopId: 'shop-2',
      });
    });

    expect(updateListItems).toHaveBeenCalledWith({ shop_id: 'shop-2' });
    expect(eqUpdateListItems).toHaveBeenCalledWith('id', 'list-item-1');
  });

  it('rolls back state and shows alert on error', async () => {
    buildFromMock([sampleRow], { error: { message: 'fail' } });
    const { result } = renderHook(() => useTodoItems('list-1'));

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.updateItem('list-item-1', {
        translationOverride: 'bad',
        shopId: null,
      });
    });

    expect(result.current.items[0].translationOverride).toBeUndefined();
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to update item. Please try again.');
  });

  it('returns false when item id not found', async () => {
    buildFromMock([sampleRow]);
    const { result } = renderHook(() => useTodoItems('list-1'));

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.updateItem('nonexistent', {
        translationOverride: null,
        shopId: null,
      });
    });

    expect(returnValue).toBe(false);
  });
});

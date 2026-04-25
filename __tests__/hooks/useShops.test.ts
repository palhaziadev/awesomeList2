import { renderHook, waitFor } from '@testing-library/react-native';
import { useShops } from '@/hooks/useShops';
import { supabase } from '@/lib/supabase.config';

jest.mock('@/lib/supabase.config', () => ({
  supabase: { from: jest.fn() },
}));

const mockFrom = supabase.from as jest.Mock;

describe('useShops', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts with isLoading true', () => {
    const select = jest.fn().mockReturnValue(new Promise(() => {}));
    mockFrom.mockReturnValue({ select });

    const { result } = renderHook(() => useShops());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns mapped shops after fetch', async () => {
    const select = jest.fn().mockResolvedValue({
      data: [
        { id: 'shop-1', shop_name: 'Lidl' },
        { id: 'shop-2', shop_name: 'Aldi' },
      ],
      error: null,
    });
    mockFrom.mockReturnValue({ select });

    const { result } = renderHook(() => useShops());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shops).toEqual([
      { shopId: 'shop-1', shopName: 'Lidl' },
      { shopId: 'shop-2', shopName: 'Aldi' },
    ]);
  });

  it('returns empty shops array on error', async () => {
    const select = jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    mockFrom.mockReturnValue({ select });

    const { result } = renderHook(() => useShops());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shops).toEqual([]);
  });

  it('queries todo_list_shop table with id and shop_name', async () => {
    const select = jest.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({ select });

    const { result } = renderHook(() => useShops());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFrom).toHaveBeenCalledWith('todo_list_shop');
    expect(select).toHaveBeenCalledWith('id, shop_name');
  });
});

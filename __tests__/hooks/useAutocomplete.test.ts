import { renderHook } from '@testing-library/react-native';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { TodoItem } from '@/models/Todo';

// Supabase mock — chained calls resolved lazily per test
const mockGetUser = jest.fn();
const mockEq = jest.fn();
const mockIlike = jest.fn().mockReturnValue({ eq: mockEq });
const mockSelect = jest.fn().mockReturnValue({ ilike: mockIlike });
const mockInsert = jest.fn();
const mockFrom = jest.fn().mockImplementation((table: string) => {
  if (table === 'todo_items') return { select: mockSelect };
  if (table === 'todo_list_items') return { insert: mockInsert };
  return {};
});

jest.mock('@/lib/supabase.config', () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    from: (table: string) => mockFrom(table),
  },
}));

const mockOnSelectExisting = jest.fn();

const mockItems: TodoItem[] = [
  { id: 'li1', itemId: 'i1', itemName: 'Milk', createdAt: '2024-01-01T00:00:00Z', createdBy: 'u1', isDone: false },
  { id: 'li2', itemId: 'i2', itemName: 'Millet bread', createdAt: '2024-01-02T00:00:00Z', createdBy: 'u1', isDone: true },
  { id: 'li3', itemId: 'i3', itemName: 'Bread', createdAt: '2024-01-03T00:00:00Z', createdBy: 'u1', isDone: false },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockEq.mockResolvedValue({ data: [], error: null });
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
});

describe('in-memory filtering', () => {
  it('returns empty suggestions when query is shorter than 2 characters', () => {
    const { result } = renderHook(() =>
      useAutocomplete('m', mockItems, 'list1', mockOnSelectExisting)
    );
    expect(result.current.suggestions).toEqual([]);
  });

  it('returns matching current-list items for query >= 2 characters', () => {
    const { result } = renderHook(() =>
      useAutocomplete('mi', mockItems, 'list1', mockOnSelectExisting)
    );
    expect(result.current.suggestions).toEqual([
      { itemId: 'i1', listItemId: 'li1', name: 'Milk', isDone: false, source: 'current' },
      { itemId: 'i2', listItemId: 'li2', name: 'Millet bread', isDone: true, source: 'current' },
    ]);
  });

  it('matches case-insensitively', () => {
    const { result } = renderHook(() =>
      useAutocomplete('MI', mockItems, 'list1', mockOnSelectExisting)
    );
    expect(result.current.suggestions.map((s) => s.name)).toContain('Milk');
  });

  it('matches substring anywhere in the name', () => {
    const { result } = renderHook(() =>
      useAutocomplete('read', mockItems, 'list1', mockOnSelectExisting)
    );
    expect(result.current.suggestions.map((s) => s.name)).toContain('Bread');
    expect(result.current.suggestions.map((s) => s.name)).toContain('Millet bread');
  });
});

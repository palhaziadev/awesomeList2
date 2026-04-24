import { act, renderHook } from '@testing-library/react-native';
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

describe('debounced other-list query', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call Supabase when query is shorter than 2 characters', async () => {
    renderHook(() =>
      useAutocomplete('m', mockItems, 'list1', mockOnSelectExisting)
    );
    jest.advanceTimersByTime(400);
    expect(mockFrom).not.toHaveBeenCalledWith('todo_items');
  });

  it('appends other-list items after debounce resolves', async () => {
    mockEq.mockResolvedValue({
      data: [{ id: 'i9', name: 'Mild salsa' }],
      error: null,
    });

    const { result } = renderHook(() =>
      useAutocomplete('mi', [], 'list1', mockOnSelectExisting)
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(result.current.suggestions).toContainEqual(
      expect.objectContaining({ name: 'Mild salsa', source: 'other' })
    );
  });

  it('de-duplicates: suppresses other-list item whose name matches a current-list item', async () => {
    mockEq.mockResolvedValue({
      data: [
        { id: 'i9', name: 'Milk' },         // same name as current-list item
        { id: 'i10', name: 'Mild salsa' },   // unique
      ],
      error: null,
    });

    const { result } = renderHook(() =>
      useAutocomplete('mi', mockItems, 'list1', mockOnSelectExisting)
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    const names = result.current.suggestions.map((s) => s.name);
    expect(names.filter((n) => n === 'Milk')).toHaveLength(1); // only one
    expect(names).toContain('Mild salsa');
  });

  it('de-duplication is case-insensitive', async () => {
    mockEq.mockResolvedValue({
      data: [{ id: 'i9', name: 'MILK' }],
      error: null,
    });

    const { result } = renderHook(() =>
      useAutocomplete('mi', mockItems, 'list1', mockOnSelectExisting)
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    const milkEntries = result.current.suggestions.filter(
      (s) => s.name.toLowerCase() === 'milk'
    );
    expect(milkEntries).toHaveLength(1);
  });

  it('clears otherSuggestions when the Supabase query returns an error', async () => {
    // First, populate otherSuggestions with a successful query
    mockEq.mockResolvedValueOnce({
      data: [{ id: 'i9', name: 'Mild salsa' }],
      error: null,
    });

    const { result, rerender } = renderHook(
      ({ q }) => useAutocomplete(q, [], 'list1', mockOnSelectExisting),
      { initialProps: { q: 'mi' } }
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // Confirm other suggestions are populated
    expect(result.current.suggestions).toHaveLength(1);

    // Now return an error on the next query
    mockEq.mockResolvedValueOnce({ data: null, error: { message: 'network error' } });

    rerender({ q: 'mild' });

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // otherSuggestions should be cleared
    expect(result.current.suggestions).toHaveLength(0);
  });
});

describe('maxSuggestions', () => {
  it('current-list items fill slots first; other-list items take the remainder', async () => {
    jest.useFakeTimers();

    // 3 current matches with query 'ar'
    const manyItems: TodoItem[] = [
      { id: 'la', itemId: 'a', itemName: 'arugula', createdAt: '', createdBy: 'u1', isDone: false },
      { id: 'lb', itemId: 'b', itemName: 'artichoke', createdAt: '', createdBy: 'u1', isDone: false },
      { id: 'lc', itemId: 'c', itemName: 'arrow root', createdAt: '', createdBy: 'u1', isDone: false },
    ];

    // 5 other-list results
    mockEq.mockResolvedValue({
      data: [
        { id: 'd', name: 'arugula' },      // duplicate (will be filtered)
        { id: 'e', name: 'artichoke' },    // duplicate (will be filtered)
        { id: 'f', name: 'array' },        // unique
        { id: 'g', name: 'bok choy' },     // no match
        { id: 'h', name: 'arctic' },       // unique
      ],
      error: null,
    });

    const { result } = renderHook(() =>
      useAutocomplete('ar', manyItems, 'list1', mockOnSelectExisting, 4)
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // 4 total: 3 current + 1 other (4 - 3 = 1 remaining slot)
    expect(result.current.suggestions).toHaveLength(4);
    expect(result.current.suggestions.filter((s) => s.source === 'current')).toHaveLength(3);
    expect(result.current.suggestions.filter((s) => s.source === 'other')).toHaveLength(1);

    jest.useRealTimers();
  });
});

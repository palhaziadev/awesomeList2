import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { supabase } from '@/lib/supabase.config';
import HomeScreen from '@/app/(tabs)/index';

jest.mock('@/lib/supabase.config', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: jest.fn(() => ({ push: jest.fn() })),
    useFocusEffect: jest.fn((cb: () => void) => {
      React.useEffect(cb, []);
    }),
  };
});

const mockFrom = supabase.from as jest.Mock;
const mockGetUser = supabase.auth.getUser as jest.Mock;

const sampleRows = [
  { id: '1', list_name: 'Groceries', owner: 'user-1', created_by: 'user-1', created_at: '2024-01-01' },
  { id: '2', list_name: 'Work Tasks', owner: 'user-1', created_by: 'user-1', created_at: '2024-01-02' },
];

function setupMocks(
  fetchResult: { data: typeof sampleRows | null; error: { message: string } | null },
  insertResult: { error: { message: string } | null } = { error: null },
) {
  const order = jest.fn().mockResolvedValue(fetchResult);
  const select = jest.fn().mockReturnValue({ order });
  const insert = jest.fn().mockResolvedValue(insertResult);
  mockFrom.mockReturnValue({ select, insert });
  return { order, select, insert };
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  it('shows ActivityIndicator while fetch is pending', () => {
    const order = jest.fn().mockReturnValue(new Promise(() => {}));
    const select = jest.fn().mockReturnValue({ order });
    mockFrom.mockReturnValue({ select });

    const { UNSAFE_getByType } = render(<HomeScreen />);

    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('hides ActivityIndicator after fetch completes', async () => {
    setupMocks({ data: [], error: null });

    const { UNSAFE_queryByType } = render(<HomeScreen />);

    await waitFor(() => {
      expect(UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    });
  });

  it('renders list items returned from Supabase', async () => {
    setupMocks({ data: sampleRows, error: null });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Groceries')).toBeTruthy();
      expect(getByText('Work Tasks')).toBeTruthy();
    });
  });

  it('shows alert when fetch fails', async () => {
    setupMocks({ data: null, error: { message: 'Network error' } });

    render(<HomeScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network error');
    });
  });

  it('disables Add button when input is empty', async () => {
    setupMocks({ data: [], error: null });

    const { getByRole } = render(<HomeScreen />);
    await waitFor(() => {}); // wait for initial fetch

    const addButton = getByRole('button', { name: /add/i });
    expect(addButton.props.accessibilityState?.disabled ?? addButton.props.disabled ?? addButton.props['aria-disabled']).toBeTruthy();
  });

  it('inserts new list and renders it on Add press', async () => {
    const { insert } = setupMocks({ data: [], error: null });

    const { getByPlaceholderText, getByText } = render(<HomeScreen />);
    await waitFor(() => {}); // wait for initial fetch

    fireEvent.changeText(getByPlaceholderText('New list name...'), 'Shopping');
    fireEvent.press(getByText('Add'));

    await waitFor(() => {
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ list_name: 'Shopping' }),
      );
      expect(getByText('Shopping')).toBeTruthy();
    });
  });

  it('clears input after successful add', async () => {
    setupMocks({ data: [], error: null });

    const { getByPlaceholderText, getByText } = render(<HomeScreen />);
    await waitFor(() => {});

    const input = getByPlaceholderText('New list name...');
    fireEvent.changeText(input, 'Shopping');
    fireEvent.press(getByText('Add'));

    await waitFor(() => {
      expect(input.props.value).toBe('');
    });
  });

  it('shows alert when insert fails', async () => {
    setupMocks({ data: [], error: null }, { error: { message: 'Insert failed' } });

    const { getByPlaceholderText, getByText } = render(<HomeScreen />);
    await waitFor(() => {});

    fireEvent.changeText(getByPlaceholderText('New list name...'), 'Bad List');
    fireEvent.press(getByText('Add'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Insert failed');
    });
  });

  it('removes list item when remove button is pressed', async () => {
    setupMocks({
      data: [{ id: '1', list_name: 'Groceries', owner: 'user-1', created_by: 'user-1', created_at: '2024-01-01' }],
      error: null,
    });

    const { getByText, queryByText, getAllByRole } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Groceries')).toBeTruthy();
    });

    // Role=button: [Add, RemoveGroceries] — remove is the last one
    const buttons = getAllByRole('button');
    fireEvent.press(buttons[buttons.length - 1], { stopPropagation: jest.fn() });

    await waitFor(() => {
      expect(queryByText('Groceries')).toBeNull();
    });
  });

  it('navigates to list detail when list item is pressed', async () => {
    const mockPush = jest.fn();
    const { useRouter } = require('expo-router');
    useRouter.mockReturnValue({ push: mockPush });
    setupMocks({ data: sampleRows, error: null });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Groceries')).toBeTruthy();
    });

    fireEvent.press(getByText('Groceries'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/list/[listId]',
      params: { listId: '1', listName: 'Groceries' },
    });
  });
});

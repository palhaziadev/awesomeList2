import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { EditItemDialog } from '@/components/EditItemDialog';
import { Shop, TodoItem } from '@/models/Todo';

jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  return {
    Button: ({ children, onPress, variant, className }: any) =>
      React.createElement(Pressable, { onPress }, children),
  };
});

jest.mock('@/components/ui/text', () => {
  const React = require('react');
  const { Text: RNText } = require('react-native');
  return {
    Text: ({ children }: any) => React.createElement(RNText, null, children),
  };
});

jest.mock('@/components/ui/input', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  return {
    Input: ({ value, onChangeText, placeholder }: any) =>
      React.createElement(TextInput, { value, onChangeText, placeholder }),
  };
});

jest.mock('@/components/ui/dialog', () => {
  const React = require('react');
  const { View, Text: RNText } = require('react-native');
  return {
    Dialog: ({ children, open }: any) =>
      open ? React.createElement(View, { testID: 'dialog' }, children) : null,
    DialogContent: ({ children }: any) => React.createElement(View, null, children),
    DialogHeader: ({ children }: any) => React.createElement(View, null, children),
    DialogTitle: ({ children }: any) => React.createElement(RNText, null, children),
    DialogFooter: ({ children }: any) => React.createElement(View, null, children),
  };
});

jest.mock('@/components/ui/dropdown-menu', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    DropdownMenu: ({ children }: any) => React.createElement(View, null, children),
    DropdownMenuTrigger: ({ children }: any) => React.createElement(View, null, children),
    DropdownMenuContent: ({ children }: any) => React.createElement(View, { testID: 'shop-options' }, children),
    DropdownMenuItem: ({ children, onPress }: any) =>
      React.createElement(Pressable, { onPress }, children),
  };
});

const sampleItem: TodoItem = {
  id: 'list-item-1',
  itemId: 'item-1',
  itemName: 'Apple',
  translation: 'Manzana',
  translationOverride: undefined,
  shopId: undefined,
  createdAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-1',
  isDone: false,
};

const sampleShops: Shop[] = [
  { shopId: 'shop-1', shopName: 'Lidl' },
  { shopId: 'shop-2', shopName: 'Aldi' },
];

describe('EditItemDialog', () => {
  it('does not render when item is null', () => {
    const { queryByTestId } = render(
      <EditItemDialog item={null} shops={[]} onSave={jest.fn()} onClose={jest.fn()} />,
    );
    expect(queryByTestId('dialog')).toBeNull();
  });

  it('renders when item is provided', () => {
    const { getByTestId } = render(
      <EditItemDialog item={sampleItem} shops={[]} onSave={jest.fn()} onClose={jest.fn()} />,
    );
    expect(getByTestId('dialog')).toBeTruthy();
  });

  it('shows item name', () => {
    const { getByText } = render(
      <EditItemDialog item={sampleItem} shops={[]} onSave={jest.fn()} onClose={jest.fn()} />,
    );
    expect(getByText('Apple')).toBeTruthy();
  });

  it('shows translation', () => {
    const { getByText } = render(
      <EditItemDialog item={sampleItem} shops={[]} onSave={jest.fn()} onClose={jest.fn()} />,
    );
    expect(getByText('Manzana')).toBeTruthy();
  });

  it('shows existing translationOverride in input', () => {
    const item = { ...sampleItem, translationOverride: 'Manzana verde' };
    const { getByDisplayValue } = render(
      <EditItemDialog item={item} shops={[]} onSave={jest.fn()} onClose={jest.fn()} />,
    );
    expect(getByDisplayValue('Manzana verde')).toBeTruthy();
  });

  it('Cancel button calls onClose without saving', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(
      <EditItemDialog item={sampleItem} shops={[]} onSave={onSave} onClose={onClose} />,
    );
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Save button calls onSave with current values then onClose', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <EditItemDialog item={sampleItem} shops={[]} onSave={onSave} onClose={onClose} />,
    );
    fireEvent.changeText(getByPlaceholderText('Override translation...'), 'Custom');
    fireEvent.press(getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({ translationOverride: 'Custom', shopId: null });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Save coerces empty override text to null', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <EditItemDialog item={sampleItem} shops={[]} onSave={onSave} onClose={jest.fn()} />,
    );
    fireEvent.press(getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({ translationOverride: null, shopId: null });
  });

  it('renders shop options', () => {
    const { getByText } = render(
      <EditItemDialog item={sampleItem} shops={sampleShops} onSave={jest.fn()} onClose={jest.fn()} />,
    );
    expect(getByText('Lidl')).toBeTruthy();
    expect(getByText('Aldi')).toBeTruthy();
  });

  it('selecting a shop updates selectedShopId passed to Save', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <EditItemDialog item={sampleItem} shops={sampleShops} onSave={onSave} onClose={jest.fn()} />,
    );
    fireEvent.press(getByText('Lidl'));
    fireEvent.press(getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({ translationOverride: null, shopId: 'shop-1' });
  });

  it('selecting None sets shopId to null', () => {
    const onSave = jest.fn();
    const item = { ...sampleItem, shopId: 'shop-1' };
    const { getByText, getAllByText } = render(
      <EditItemDialog item={item} shops={sampleShops} onSave={onSave} onClose={jest.fn()} />,
    );
    fireEvent.press(getAllByText('None')[0]);
    fireEvent.press(getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({ translationOverride: null, shopId: null });
  });

  it('resets state when item changes', async () => {
    const onSave = jest.fn();
    const { getByPlaceholderText, rerender } = render(
      <EditItemDialog
        item={{ ...sampleItem, translationOverride: 'First' }}
        shops={[]}
        onSave={onSave}
        onClose={jest.fn()}
      />,
    );
    expect(getByPlaceholderText('Override translation...').props.value).toBe('First');

    rerender(
      <EditItemDialog
        item={{ ...sampleItem, id: 'list-item-2', translationOverride: 'Second' }}
        shops={[]}
        onSave={onSave}
        onClose={jest.fn()}
      />,
    );
    await waitFor(() => {
      expect(getByPlaceholderText('Override translation...').props.value).toBe('Second');
    });
  });
});

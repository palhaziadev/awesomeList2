import { fireEvent, render } from '@testing-library/react-native';
import * as React from 'react';
import { ItemListFilter } from '@/components/ItemListFilter';

jest.mock('@/components/ui/popover', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Popover: ({ children }: any) => React.createElement(View, null, children),
    PopoverTrigger: ({ children }: any) => React.createElement(View, null, children),
    PopoverContent: ({ children, className }: any) => React.createElement(View, { className }, children),
  };
});

jest.mock('@/components/ui/toggle', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  return {
    Toggle: ({ children, onPressedChange, testID, ...props }: any) =>
      React.createElement(Pressable, { onPress: () => onPressedChange?.(!props.pressed), testID }, children),
  };
});

jest.mock('lucide-react-native', () => ({
  ListFilter: () => require('react').createElement(require('react-native').View),
  ArrowUpNarrowWide: () => require('react').createElement(require('react-native').View),
  ArrowDownNarrowWide: () => require('react').createElement(require('react-native').View),
}));

describe('ItemListFilter', () => {
  it('renders the Group by Shop label when groupByShop prop is provided', () => {
    const { getByText } = render(
      <ItemListFilter groupByShop={false} onGroupByShopChange={jest.fn()} />,
    );
    expect(getByText('Group by Shop')).toBeTruthy();
  });

  it('calls onGroupByShopChange(true) when toggle is pressed while off', () => {
    const onGroupByShopChange = jest.fn();
    const { getByTestId } = render(
      <ItemListFilter
        groupByShop={false}
        onGroupByShopChange={onGroupByShopChange}
      />,
    );
    fireEvent.press(getByTestId('group-by-shop-toggle'));
    expect(onGroupByShopChange).toHaveBeenCalledWith(true);
  });

  it('calls onGroupByShopChange(false) when toggle is pressed while on', () => {
    const onGroupByShopChange = jest.fn();
    const { getByTestId } = render(
      <ItemListFilter
        groupByShop={true}
        onGroupByShopChange={onGroupByShopChange}
      />,
    );
    fireEvent.press(getByTestId('group-by-shop-toggle'));
    expect(onGroupByShopChange).toHaveBeenCalledWith(false);
  });
});

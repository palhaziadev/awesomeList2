import { fireEvent, render } from '@testing-library/react-native';
import * as React from 'react';
import { TodoItemRow } from '@/components/TodoItemRow';
import { TodoItem } from '@/models/Todo';

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

describe('TodoItemRow', () => {
  it('calls onPress when the text area is pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <TodoItemRow
        item={sampleItem}
        onRemove={jest.fn()}
        onToggleDone={jest.fn()}
        onPress={onPress}
      />,
    );
    fireEvent.press(getByText('Apple'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when remove button is pressed', () => {
    const onPress = jest.fn();
    const onRemove = jest.fn();
    const { getAllByRole } = render(
      <TodoItemRow
        item={sampleItem}
        onRemove={onRemove}
        onToggleDone={jest.fn()}
        onPress={onPress}
      />,
    );
    const buttons = getAllByRole('button');
    fireEvent.press(buttons[buttons.length - 1]);
    expect(onPress).not.toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalledWith('list-item-1');
  });

  it('shows translationOverride instead of translation when defined', () => {
    const item = { ...sampleItem, translationOverride: 'Manzana verde' };
    const { getByText, queryByText } = render(
      <TodoItemRow item={item} onRemove={jest.fn()} onToggleDone={jest.fn()} onPress={jest.fn()} />,
    );
    expect(getByText('Manzana verde')).toBeTruthy();
    expect(queryByText('Manzana')).toBeNull();
  });

  it('shows translation when translationOverride is undefined', () => {
    const { getByText } = render(
      <TodoItemRow item={sampleItem} onRemove={jest.fn()} onToggleDone={jest.fn()} onPress={jest.fn()} />,
    );
    expect(getByText('Manzana')).toBeTruthy();
  });
});

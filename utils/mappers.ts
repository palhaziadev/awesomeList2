import { TodoItem } from "@/models/Todo";

type TodoListItemRow = {
  id: string;
  item_id: string;
  created_at: string;
  created_by: string | null;
  is_done: boolean | null;
  shop_id?: string | null;
};

export function mapRowToTodoItem(
  row: TodoListItemRow,
  itemName: string,
  translation?: string,
  translationOverride?: string,
): TodoItem {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName,
    translation,
    translationOverride,
    shopId: row.shop_id ?? undefined,
    createdAt: row.created_at,
    createdBy: row.created_by ?? "",
    isDone: row.is_done ?? false,
  };
}

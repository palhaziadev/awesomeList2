import { TodoItem } from "@/models/Todo";

type TodoListItemRow = {
  id: string;
  item_id: string;
  created_at: string;
  created_by: string | null;
  is_done: boolean | null;
};

export function mapRowToTodoItem(row: TodoListItemRow, itemName: string): TodoItem {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName,
    createdAt: row.created_at,
    createdBy: row.created_by ?? "",
    isDone: row.is_done ?? false,
  };
}

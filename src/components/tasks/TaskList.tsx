import { listTasksToday } from "@/db/listTasksToday";
import TaskItem from "./TaskItem";

interface Props {
  userId: string;
}

export default async function TaskList({ userId }: Props) {
  const tasks = await listTasksToday(userId);

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">No tasks for today yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <TaskItem key={t.id} task={t} />
      ))}
    </ul>
  );
} 
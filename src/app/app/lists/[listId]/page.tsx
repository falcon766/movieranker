import { ListEditor } from "@/components/list/ListEditor";

export default async function ListPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  return <ListEditor listId={listId} />;
}

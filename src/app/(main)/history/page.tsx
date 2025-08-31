import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ConversationList } from "@/components/history/ConversationList";

export default async function HistoryPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="h-screen">
      <ConversationList />
    </div>
  );
}
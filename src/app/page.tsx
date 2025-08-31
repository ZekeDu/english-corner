import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="h-screen">
      <ChatWindow />
    </div>
  );
}
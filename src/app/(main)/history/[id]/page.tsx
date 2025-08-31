import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { NavigationHeader } from "@/components/layout/NavigationHeader";

interface ConversationDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ConversationDetailPage({
  params,
}: ConversationDetailPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const conversationId = parseInt(id);

  if (isNaN(conversationId)) {
    redirect("/history");
  }

  // 获取对话详情
  const conversation = await db.conversation.findUnique({
    where: {
      id: conversationId,
      userId: parseInt(session.user.id),
    },
  });

  if (!conversation) {
    redirect("/history");
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <NavigationHeader 
        title={conversation.title || "对话详情"} 
        showBack={true} 
        backHref="/history" 
      />
      
      <div className="flex-1 overflow-hidden">
        <ChatWindow 
          conversationId={conversation.id}
          initialMessages={conversation.messages as unknown[]}
          isReadOnly={true}
        />
      </div>
    </div>
  );
}
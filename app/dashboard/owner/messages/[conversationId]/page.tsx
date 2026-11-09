import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getConversationForParticipant } from "@/lib/messages/queries";
import ChatThread from "@/app/dashboard/_components/ChatThread";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants/property";

export const dynamic = "force-dynamic";

interface OwnerConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function OwnerConversationPage({
  params,
}: OwnerConversationPageProps) {
  const session = await getSession();
  if (!session || session.activeRole !== "OWNER") {
    redirect("/login");
  }

  const { conversationId } = await params;
  const conversation = await getConversationForParticipant(
    conversationId,
    session.userId,
    "OWNER",
  );
  if (!conversation) {
    notFound();
  }

  return (
    <main className="relative -mb-16 h-[100dvh] w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <ChatThread
        conversationId={conversationId}
        currentRole="OWNER"
        propertyId={conversation.propertyId}
        propertyTitle={conversation.propertyTitle}
        propertyCity={conversation.propertyCity}
        propertyTypeLabel={
          conversation.propertyType
            ? PROPERTY_TYPE_LABELS[conversation.propertyType]
            : null
        }
        propertyCoverImage={conversation.propertyCoverImage}
        isListingDeleted={conversation.isListingDeleted}
        counterpartName={conversation.counterpartName}
      />
    </main>
  );
}

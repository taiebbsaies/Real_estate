import { redirect } from "next/navigation";
import type { Metadata } from "next";
import ConversationList from "@/app/dashboard/_components/ConversationList";
import { getSession } from "@/lib/session";
import { listConversationsForOwner } from "@/lib/messages/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Messages — HomeCheck",
  description: "Vos conversations avec les locataires.",
};

export default async function OwnerMessagesPage() {
  const session = await getSession();
  if (!session || session.activeRole !== "OWNER") {
    redirect("/login");
  }

  const conversations = await listConversationsForOwner(session.userId);

  return <ConversationList role="OWNER" conversations={conversations} />;
}

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import ConversationList from "@/app/dashboard/_components/ConversationList";
import { getSession } from "@/lib/session";
import { listConversationsForTenant } from "@/lib/messages/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Messages — HomeCheck",
  description: "Vos conversations avec les propriétaires de logements.",
};

export default async function TenantMessagesPage() {
  const session = await getSession();
  if (!session || session.activeRole !== "TENANT") {
    redirect("/login");
  }

  const conversations = await listConversationsForTenant(session.userId);

  return <ConversationList role="TENANT" conversations={conversations} />;
}

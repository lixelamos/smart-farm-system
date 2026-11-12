import { notFound } from "next/navigation";
import { backendUser as sessionUser } from "@/lib/php-backend";
import { mayAccess } from "@/lib/domain";
import { WorkspaceScreen } from "@/components/workspace-screen";
export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const user = await sessionUser();
  if (!user || !mayAccess(user.role, section)) notFound();
  return <WorkspaceScreen section={section} />;
}

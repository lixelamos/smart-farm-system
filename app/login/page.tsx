import { AuthForm } from "@/components/auth-form";
import { roles, type Role } from "@/lib/domain";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  return (
    <AuthForm
      mode="login"
      initialRole={roles.includes(role as Role) ? (role as Role) : "farmer"}
    />
  );
}

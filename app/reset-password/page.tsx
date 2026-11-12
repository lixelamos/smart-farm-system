import { AuthForm } from "@/components/auth-form";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default function Reset() {
  return <AuthForm mode="reset" />;
}

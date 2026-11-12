"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
export default function Logout() {
  const router = useRouter();
  return (
    <main className="container error-screen">
      <h1>Sign out of Smart Farm?</h1>
      <button
        className="button button-primary"
        onClick={async () => {
          await api("logout", {});
          router.push("/login");
          router.refresh();
        }}
      >
        Sign out
      </button>
    </main>
  );
}

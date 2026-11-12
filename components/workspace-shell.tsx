"use client";
import { createContext, useContext, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Leaf,
  Users,
  MapPin,
  Wallet,
  Newspaper,
  MessageSquare,
  User,
  ShoppingBag,
  Package,
  Shield,
} from "lucide-react";
import { Brand } from "./brand";
import { navigation, type User as FarmUser } from "@/lib/domain";
import { api } from "@/lib/client";
const UserContext = createContext<FarmUser | null>(null);
export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("Workspace user missing.");
  return user;
}
const icons: Record<string, typeof Leaf> = {
  overview: LayoutDashboard,
  farmers: Users,
  agronomists: Users,
  stations: MapPin,
  demand: Leaf,
  supplies: Package,
  inputs: Package,
  products: ShoppingBag,
  sales: ShoppingBag,
  purchases: ShoppingBag,
  payments: Wallet,
  news: Newspaper,
  messages: MessageSquare,
  account: User,
  accounts: Shield,
};
export function WorkspaceShell({
  user,
  children,
}: {
  user: FarmUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const key = pathname.split("/")[2] || "overview";
  useEffect(() => {
    if (!open) return;
    const panel = sidebar.current;
    const links = panel?.querySelectorAll<HTMLElement>("a,button");
    links?.[0]?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
      if (event.key === "Tab" && links?.length) {
        if (event.shiftKey && document.activeElement === links[0]) {
          event.preventDefault();
          links[links.length - 1].focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === links[links.length - 1]
        ) {
          event.preventDefault();
          links[0].focus();
        }
      }
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [open]);
  async function signOut() {
    try {
      await api("logout", {});
      router.push("/login");
      router.refresh();
    } catch {
      setError("Could not sign out. Try again.");
    }
  }
  return (
    <UserContext.Provider value={user}>
      <div className={`app-page role-${user.role}${open ? " menu-open" : ""}`}>
        <a className="skip-link" href="#workspace-content">
          Skip to workspace
        </a>
        <aside
          className="app-sidebar"
          ref={sidebar}
          id="workspace-menu"
          aria-label="Workspace navigation"
        >
          <Brand />
          <div className="workspace-label">{user.role} workspace</div>
          <ul className="workspace-links">
            {navigation[user.role].map((item) => {
              const Icon = icons[item.key] || Leaf;
              return (
                <li key={item.key}>
                  <Link
                    className={`workspace-link ${key === item.key ? "is-active" : ""}`}
                    aria-current={key === item.key ? "page" : undefined}
                    href={
                      item.key === "overview"
                        ? "/workspace"
                        : `/workspace/${item.key}`
                    }
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="sidebar-bottom">
            <span className="user-avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.role} account</small>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={signOut}
              aria-label="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </aside>
        {open && (
          <div
            className="menu-scrim"
            onClick={() => {
              setOpen(false);
              menuButton.current?.focus();
            }}
            aria-hidden="true"
          />
        )}
        <section className="app-content" id="workspace-content">
          <header className="app-header">
            <button
              className="menu-toggle"
              ref={menuButton}
              aria-controls="workspace-menu"
              aria-expanded={open}
              aria-label={open ? "Close navigation" : "Open navigation"}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
            <div>
              <span className="breadcrumb">Workspace / </span>
              <strong>
                {navigation[user.role].find((item) => item.key === key)
                  ?.label ?? "Overview"}
              </strong>
            </div>
            <span className="header-context">Narok County · {user.role}</span>
          </header>
          <div className="workspace-body">
            <div className="mainactivity">
              {error && (
                <p className="feedback error" role="alert">
                  {error}
                </p>
              )}
              {children}
            </div>
          </div>
        </section>
      </div>
    </UserContext.Provider>
  );
}

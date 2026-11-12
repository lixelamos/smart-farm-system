export const roles = ["admin", "manager", "farmer", "agronomist"] as const;
export type Role = (typeof roles)[number];
export type User = {
  id: number;
  role: Role;
  name: string;
  identifier: string;
  location: string;
};
export type RecordRow = Record<string, string | number | null>;
export const counties = [
  "Narok North",
  "Narok East",
  "Narok South",
  "Narok West",
  "Kilgoris",
  "Emurua Dikirr",
] as const;
export const accountTables: Record<Role, string> = {
  admin: "admin",
  manager: "manager",
  farmer: "farmers",
  agronomist: "agronomists",
};
export const navigation: Record<Role, { key: string; label: string }[]> = {
  admin: [
    { key: "overview", label: "Overview" },
    { key: "farmers", label: "Farmers" },
    { key: "stations", label: "Pickup stations" },
    { key: "demand", label: "Produce demand" },
    { key: "supplies", label: "Supplies" },
    { key: "inputs", label: "Farm inputs" },
    { key: "products", label: "Products" },
    { key: "sales", label: "Input sales" },
    { key: "purchases", label: "Product purchases" },
    { key: "payments", label: "Payments" },
    { key: "news", label: "County news" },
    { key: "accounts", label: "Account recovery" },
    { key: "account", label: "My account" },
  ],
  manager: [
    { key: "overview", label: "Overview" },
    { key: "farmers", label: "Farmers" },
    { key: "agronomists", label: "Agronomists" },
    { key: "demand", label: "Produce demand" },
    { key: "supplies", label: "Supplies" },
    { key: "inputs", label: "Farm inputs" },
    { key: "products", label: "Products" },
    { key: "sales", label: "Input sales" },
    { key: "purchases", label: "Product purchases" },
    { key: "payments", label: "Payments" },
    { key: "news", label: "County news" },
    { key: "account", label: "My account" },
  ],
  farmer: [
    { key: "overview", label: "Overview" },
    { key: "demand", label: "Produce opportunities" },
    { key: "supplies", label: "My supplies" },
    { key: "inputs", label: "Farm inputs" },
    { key: "products", label: "Products" },
    { key: "sales", label: "Input purchases" },
    { key: "purchases", label: "Product purchases" },
    { key: "payments", label: "Payments" },
    { key: "messages", label: "Messages" },
    { key: "news", label: "County news" },
    { key: "account", label: "My account" },
  ],
  agronomist: [
    { key: "overview", label: "Overview" },
    { key: "messages", label: "Messages" },
    { key: "news", label: "County news" },
    { key: "account", label: "My account" },
  ],
};
export function money(value: unknown) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}
export function dateTime(value: unknown) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date(Number(value) * 1000));
}
export function chatKey(user: Pick<User, "role" | "id">) {
  return `${user.role === "farmer" ? "f" : "a"}-${user.id}`;
}
export function mayAccess(role: Role, section: string) {
  return navigation[role].some((item) => item.key === section);
}

import type { Metadata } from "next";
import "./globals.css";
import "./workspace.css";
import "./next-ui.css";
export const metadata: Metadata = {
  title: {
    default: "Smart Farm · Narok County",
    template: "%s · Smart Farm Narok",
  },
  description:
    "Farming in Narok, connected. Produce opportunities, inputs, payment records, and agronomist support.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

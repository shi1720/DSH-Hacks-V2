import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lotlight |  Recall to resolution",
  description:
    "Evidence-backed medical recall review. Connect the notice to your inventory and document the response. A project by Shivam Gupta.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

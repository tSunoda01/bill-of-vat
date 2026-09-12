import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pyxis - Smart Multi-Business VAT & Billing System",
  description: "Sri Lanka IRD Gazette No. 2481/22 Compliant Invoicing & Multi-Tenant Billing Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-page dark:bg-slate-900 text-dark dark:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
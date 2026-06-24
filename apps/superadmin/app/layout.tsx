import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "onClick | Superadmin",
  description: "Panel de administración de onClick",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary">
        {children}
      </body>
    </html>
  );
}

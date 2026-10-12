import type { Metadata, Viewport } from "next";
import "./globals.css";

const title = "Allowance — a company card for your AI employees";
const description =
  "Give every AI agent a USDC budget it physically cannot exceed. Solana spending limits enforced on-chain by the SPL Token program, instant x402 payments, one-tap owner approval and on-chain receipts.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://allowance.olivia.saint.work"),
  openGraph: { title, description, type: "website", images: ["/logo.png"] },
  twitter: { card: "summary_large_image", title, description, images: ["/logo.png"] },
  icons: { icon: "/logo.svg" },
};

export const viewport: Viewport = { themeColor: "#0f172a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className="scroll-smooth">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import Script from "next/script";
import { ToastProvider } from "./components/ui/toast";
import { nunito } from "./fonts";
import "./globals.css";

const title = "Dice Table";
const description = "Five dice, three rolls. Join the game";

export const metadata: Metadata = {
  metadataBase: new URL("https://dice-table.com"),
  title,
  description,
  // What messengers show when a game link is shared.
  openGraph: {
    type: "website",
    siteName: title,
    title,
    description,
    url: "/",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
        {/* Cookieless analytics; data-domains keeps localhost visits out of the stats. */}
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="47608c7c-0fd8-438d-812e-9c72e2723012"
          data-domains="dice-table.com"
        />
      </body>
    </html>
  );
}

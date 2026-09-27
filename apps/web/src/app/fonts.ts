import { Nunito } from "next/font/google";

// Shared by the root layout and global-error, which replaces the layout and brings its own <html>
export const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800"],
});

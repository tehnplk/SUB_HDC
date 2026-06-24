import "./globals.css";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata = {
  title: "SUB HDC",
  description: "SUB HDC data import workspace",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={spaceGrotesk.variable}>
      <body>{children}</body>
    </html>
  );
}

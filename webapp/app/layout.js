import "./globals.css";
import { Noto_Sans_Thai, Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-noto-sans-thai",
});

export const metadata = {
  title: "SUB HDC",
  description: "SUB HDC data import workspace",
  icons: {
    icon: "/encrypted.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${spaceGrotesk.variable} ${notoSansThai.variable}`}>
      <body>{children}</body>
    </html>
  );
}

import "./globals.css";
import { Noto_Sans_Thai, Space_Grotesk } from "next/font/google";
import FloatingUserMenu from "../components/floating-user-menu";
import { auth } from "../auth";

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

export default async function RootLayout({ children }) {
  const session = await auth();

  return (
    <html lang="th" className={`${spaceGrotesk.variable} ${notoSansThai.variable}`}>
      <body>
        {children}
        <FloatingUserMenu userName={session?.user?.name} centerName={process.env.CENTER_NAME} />
      </body>
    </html>
  );
}

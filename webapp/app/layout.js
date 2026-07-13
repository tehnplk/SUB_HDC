import "./globals.css";
import { Noto_Sans_Thai, Space_Grotesk } from "next/font/google";
import { auth } from "../auth";
import { isAdminSession } from "../lib/admin-auth";
import { UserSessionProvider } from "../components/user-session-context";
import { createDbConnection } from "../lib/db";

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

async function getHospitalName(hoscode) {
  if (!hoscode) return "";
  let connection;
  try {
    connection = await createDbConnection();
    const [rows] = await connection.query(
      "SELECT hospname FROM c_hospital WHERE hospcode = ? LIMIT 1",
      [hoscode],
    );
    return rows[0]?.hospname || "";
  } catch {
    return "";
  } finally {
    if (connection) await connection.end();
  }
}

async function getRoleDetails(roleId, fallbackRole) {
  if (!roleId && !fallbackRole) return { role: "", note: "" };
  let connection;
  try {
    connection = await createDbConnection();
    const hasRoleId = Number.isInteger(Number(roleId)) && Number(roleId) > 0;
    const [rows] = await connection.query(
      hasRoleId
        ? "SELECT role, note FROM c_user_role WHERE id = ? LIMIT 1"
        : "SELECT role, note FROM c_user_role WHERE role = ? LIMIT 1",
      [hasRoleId ? Number(roleId) : fallbackRole],
    );
    return { role: rows[0]?.role || "", note: rows[0]?.note || "" };
  } catch {
    return { role: "", note: "" };
  } finally {
    if (connection) await connection.end();
  }
}

export default async function RootLayout({ children }) {
  const session = await auth();
  const hoscode = session?.user?.hoscode || "";
  const [hospitalName, roleDetails] = await Promise.all([
    getHospitalName(hoscode),
    getRoleDetails(session?.user?.roleId, session?.user?.role),
  ]);
  const firstname = session?.user?.profile?.firstname_th;
  const profileAvatarInitial = typeof firstname === "string" ? Array.from(firstname.trim())[0] || "" : "";

  return (
    <html lang="th" className={`${spaceGrotesk.variable} ${notoSansThai.variable}`}>
      <body>
        <UserSessionProvider value={{
          userName: session?.user?.name,
          userFullname: session?.user?.fullname,
          userAvatarInitial: profileAvatarInitial || session?.user?.avatarInitial,
          providerId: session?.user?.providerId,
          userRole: roleDetails.role || session?.user?.role,
          userRoleNote: roleDetails.note,
          hoscode,
          hospitalName,
          isAdmin: isAdminSession(session),
          centerName: process.env.CENTER_NAME,
        }}>
          {children}
        </UserSessionProvider>
      </body>
    </html>
  );
}

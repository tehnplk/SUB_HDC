import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

function getConfiguredUser() {
  const username = process.env.AUTH_USERNAME || "admin";
  const password = process.env.AUTH_PASSWORD;
  if (!password) return null;

  return {
    id: "admin",
    name: username,
    username,
    password,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.JWT_KEY,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const configuredUser = getConfiguredUser();
        const username = String(credentials?.username || "").trim();
        const password = String(credentials?.password || "");

        if (!configuredUser || username !== configuredUser.username || password !== configuredUser.password) {
          return null;
        }

        return {
          id: configuredUser.id,
          name: configuredUser.name,
        };
      },
    }),
  ],
  callbacks: {
    authorized({ auth: session }) {
      return !!session?.user;
    },
  },
});

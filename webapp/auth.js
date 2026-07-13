import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { registerProviderUser, verifyProviderProfile } from "./lib/provider-auth.js";

function getConfiguredUser() {
  const username = process.env.AUTH_USERNAME || "admin";
  const password = process.env.AUTH_PASSWORD;
  if (!password) return null;

  return {
    id: "admin",
    name: username,
    username,
    password,
    role: "admin",
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
    maxAge: 60 * 60 * 24,
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (credentials?.loginType === "provider-id") {
          const serializedProfile = String(credentials?.profile || "");
          const signature = String(credentials?.signature || "");
          if (!verifyProviderProfile(serializedProfile, signature)) return null;
          try {
            const profile = JSON.parse(serializedProfile);
            const providerUser = await registerProviderUser(profile);
            if (!providerUser) return null;
            return {
              id: providerUser.providerId,
              name: providerUser.fullname || providerUser.providerId,
              fullname: providerUser.fullname,
              avatarInitial: providerUser.avatarInitial,
              profile,
              providerId: providerUser.providerId,
              hoscode: providerUser.hoscode,
              roleId: providerUser.roleId,
              role: providerUser.role,
            };
          } catch {
            return null;
          }
        }

        const configuredUser = getConfiguredUser();
        const username = String(credentials?.username || "").trim();
        const password = String(credentials?.password || "");

        if (!configuredUser || username !== configuredUser.username || password !== configuredUser.password) {
          return null;
        }

        return {
          id: configuredUser.id,
          name: configuredUser.name,
          fullname: configuredUser.name,
          isConfiguredUser: true,
          role: configuredUser.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.providerId = user.providerId;
        token.hoscode = user.hoscode;
        token.fullname = user.fullname || user.name;
        token.avatarInitial = user.avatarInitial;
        token.profile = user.profile;
        token.roleId = user.roleId;
        token.isConfiguredUser = user.isConfiguredUser === true;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.providerId = token.providerId;
        session.user.hoscode = token.hoscode;
        session.user.fullname = token.fullname;
        session.user.avatarInitial = token.avatarInitial;
        session.user.profile = token.profile;
        session.user.roleId = token.roleId;
        session.user.isConfiguredUser = token.isConfiguredUser === true;
        session.user.role = token.role;
      }
      return session;
    },
    authorized({ auth: session }) {
      return !!session?.user;
    },
  },
});

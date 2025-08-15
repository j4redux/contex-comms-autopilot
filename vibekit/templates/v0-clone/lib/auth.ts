import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// Extend the session type to include custom properties
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    githubId?: string;
    githubUsername?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo read:org",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      if (account?.provider === "github") {
        return true;
      }
      return true;
    },

    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and refresh_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.githubId = profile?.id;
        token.githubUsername = profile?.login;
      }

      return token;
    },

    async session({ session, token }) {
      // Send properties to the client
      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
        session.githubId = token.githubId as string;
        session.githubUsername = token.githubUsername as string;
      }

      return session;
    },
  },
  debug: process.env.NODE_ENV === "development", // Enable debug mode to see more logs
});

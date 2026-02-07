import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "producer" | "consumer" | "admin";
      company?: string | null;
      isDemo: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: "producer" | "consumer" | "admin";
    company?: string | null;
    isDemo: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "producer" | "consumer" | "admin";
    company?: string | null;
    isDemo: boolean;
  }
}

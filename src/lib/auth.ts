import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "recruiter@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }
        await dbConnect();
        
        try {
          const user = await User.findOne({ email: credentials.email });
          if (!user) throw new Error("Invalid email or password");
          
          const isMatch = await bcrypt.compare(credentials.password, user.password);
          if (!isMatch) throw new Error("Invalid email or password");

          return { 
            id: user._id.toString(), 
            name: user.name, 
            email: user.email, 
            role: user.role 
          };
        } catch (error: any) {
          throw new Error(error.message);
        }
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  }
};

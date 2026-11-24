"use client";

import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/store";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ReduxProvider store={store}>
        <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            {children}
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </NextThemesProvider>
      </ReduxProvider>
    </AuthProvider>
  );
}

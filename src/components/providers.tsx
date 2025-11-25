"use client";

import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "./ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <Toaster />
        </AuthProvider>
    )
}

"use client";

import { ReactNode, useState } from "react";
import UserSidebar from "./components/UserSidebar";
import ProtectedUser from "./components/ProtectedUser";

interface UserLayoutProps {
    children: ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <ProtectedUser>
            <div className="flex h-screen bg-slate-950 text-slate-100">
                <UserSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

                <main className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </ProtectedUser>
    );
}

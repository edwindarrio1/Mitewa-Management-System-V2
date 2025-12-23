"use client";

import { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    HiOutlineHome,
    HiOutlineCurrencyDollar,
    HiOutlineDocumentText,
    HiOutlineChat,
    HiOutlineLogout,
    HiOutlineUser
} from "react-icons/hi";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/firebaseConfig";

interface UserSidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: Dispatch<SetStateAction<boolean>>;
}

export default function UserSidebar({ isCollapsed, setIsCollapsed }: UserSidebarProps) {
    const pathname = usePathname();

    const navItems = [
        { label: "Overview", href: "/dashboard", icon: <HiOutlineHome size={20} /> },
        { label: "My Loans", href: "/dashboard/loans", icon: <HiOutlineCurrencyDollar size={20} /> },
        { label: "Savings", href: "/dashboard/shares", icon: <HiOutlineCurrencyDollar size={20} /> },
        { label: "Treasury Report", href: "/dashboard/reports", icon: <HiOutlineDocumentText size={20} /> },
        { label: "Profile", href: "/dashboard/profile", icon: <HiOutlineUser size={20} /> },
        { label: "Chat with Admin", href: "/dashboard/chat", icon: <HiOutlineChat size={20} /> },
    ];

    const handleLogout = async () => {
        try {
            await signOut(auth);
            window.location.href = "/login";
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <aside className={`flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"}`}>
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
                <span className={`text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 ${isCollapsed ? "hidden" : "block"}`}>
                    Mitewa User
                </span>
                <button className="text-slate-400 hover:text-white" onClick={() => setIsCollapsed(!isCollapsed)}>
                    {isCollapsed ? "➡️" : "⬅️"}
                </button>
            </div>

            <nav className="flex-1 mt-6">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-4 px-4 py-3 hover:bg-slate-800/50 transition-colors duration-200 ${pathname === item.href ? "bg-slate-800 text-emerald-400" : "text-slate-300"
                            }`}
                    >
                        <span>{item.icon}</span>
                        {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 px-4 py-3 w-full text-left text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                >
                    <HiOutlineLogout size={20} />
                    {!isCollapsed && <span className="font-medium">Logout</span>}
                </button>
            </div>
        </aside>
    );
}

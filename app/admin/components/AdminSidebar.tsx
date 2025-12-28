"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiOutlineUsers,
  HiOutlineHome,
  HiOutlineCurrencyDollar,
  HiOutlineChartBar,
  HiOutlineDocumentText,
  HiOutlineChat,
  HiOutlineUserAdd,
  HiOutlineExclamation
} from "react-icons/hi";
import { Dispatch, SetStateAction } from "react";

interface AdminSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: Dispatch<SetStateAction<boolean>>;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
}

export default function AdminSidebar({
  isCollapsed,
  setIsCollapsed,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: <HiOutlineHome size={20} /> },
    { label: "Members", href: "/admin/members", icon: <HiOutlineUsers size={20} /> },
    { label: "Invite Users", href: "/admin/invite", icon: <HiOutlineUserAdd size={20} /> },
    { label: "Loans", href: "/admin/loans", icon: <HiOutlineCurrencyDollar size={20} /> },
    { label: "Savings", href: "/admin/savings", icon: <HiOutlineCurrencyDollar size={20} /> },
    { label: "Investments & Risks", href: "/admin/investments", icon: <HiOutlineChartBar size={20} /> },
    { label: "Collections & Expenses", href: "/admin/expenses", icon: <HiOutlineDocumentText size={20} /> },
    { label: "Messages", href: "/admin/messages", icon: <HiOutlineChat size={20} /> },
    { label: "Reports", href: "/admin/reports", icon: <HiOutlineDocumentText size={20} /> },
    { label: "Analysis", href: "/admin/analysis", icon: <HiOutlineChartBar size={20} /> },
    { label: "Maintenance", href: "/admin/maintenance", icon: <HiOutlineExclamation size={20} /> },
  ];

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-30 md:relative md:translate-x-0 transform transition-all duration-300 ease-in-out
      flex flex-col bg-gray-800 border-r border-gray-700
      ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      ${isCollapsed ? "md:w-20" : "md:w-64"}
      w-64
    `}>
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        <span className={`text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 ${isCollapsed ? "md:hidden" : "block"}`}>
          Mitewa Admin
        </span>
        <button
          className="text-gray-400 hover:text-white p-2"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <span className="hidden md:inline">{isCollapsed ? "➡️" : "⬅️"}</span>
          <span className="md:hidden" onClick={() => setIsMobileMenuOpen(false)}>✕</span>
        </button>
      </div>

      <nav className="flex-1 mt-6 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-700/50 transition-colors duration-200 ${pathname === item.href ? "bg-gray-700/70" : ""
              }`}
          >
            <span className="text-cyan-400">{item.icon}</span>
            <span className={`${isCollapsed ? "md:hidden" : "block"}`}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

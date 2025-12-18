"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  HiOutlineUsers, 
  HiOutlineHome, 
  HiOutlineCurrencyDollar, 
  HiOutlineChartBar, 
  HiOutlineDocumentText 
} from "react-icons/hi";
import { Dispatch, SetStateAction } from "react";

interface AdminSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: Dispatch<SetStateAction<boolean>>;
}

export default function AdminSidebar({ isCollapsed, setIsCollapsed }: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: <HiOutlineHome size={20} /> },
    { label: "Members", href: "/admin/members", icon: <HiOutlineUsers size={20} /> },
    { label: "Loans", href: "/admin/loans", icon: <HiOutlineCurrencyDollar size={20} /> },
    { label: "Savings", href: "/admin/savings", icon: <HiOutlineCurrencyDollar size={20} /> },
    { label: "Investments & Risks", href: "/admin/investments", icon: <HiOutlineChartBar size={20} /> },
    { label: "Collections & Expenses", href: "/admin/expenses", icon: <HiOutlineDocumentText size={20} /> },
    { label: "Reports", href: "/admin/reports", icon: <HiOutlineDocumentText size={20} /> },
    { label: "Analysis", href: "/admin/analysis", icon: <HiOutlineChartBar size={20} /> },
  ];

  return (
    <aside className={`flex flex-col bg-gray-800 border-r border-gray-700 transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"}`}>
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        <span className={`text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 ${isCollapsed ? "hidden" : "block"}`}>
          Mitewa Admin
        </span>
        <button className="text-gray-400 hover:text-white" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? "➡️" : "⬅️"}
        </button>
      </div>

      <nav className="flex-1 mt-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-700/50 transition-colors duration-200 ${
              pathname === item.href ? "bg-gray-700/70" : ""
            }`}
          >
            <span className="text-cyan-400">{item.icon}</span>
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

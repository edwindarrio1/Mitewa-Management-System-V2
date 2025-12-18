"use client";

import { ReactNode, useState } from "react";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import ProtectedAdmin from "./components/ProtectedAdmin"; // Import protection

interface AdminLayoutProps {
  children: ReactNode;
}

// Wrap the original layout in ProtectedAdmin without modifying its content
export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <ProtectedAdmin>
      <div className="flex h-screen bg-gray-900 text-white">
        <AdminSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

        <main className="flex-1 p-6 overflow-y-auto">
          <AdminNavbar />
          <div>{children}</div>
        </main>
      </div>
    </ProtectedAdmin>
  );
}

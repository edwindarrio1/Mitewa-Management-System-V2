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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <ProtectedAdmin>
      <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
        {/* Sidebar for Desktop & Mobile Overlay */}
        <AdminSidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {/* Backdrop for Mobile Sidebar */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminNavbar setIsMobileMenuOpen={setIsMobileMenuOpen} />
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </ProtectedAdmin>
  );
}

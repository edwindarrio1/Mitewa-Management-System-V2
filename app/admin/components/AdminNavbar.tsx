"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/firebaseConfig";

import { Dispatch, SetStateAction } from "react";
import { HiOutlineMenuAlt2 } from "react-icons/hi";

interface AdminNavbarProps {
  title?: string;
  setIsMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
}

export default function AdminNavbar({ title = "Dashboard", setIsMobileMenuOpen }: AdminNavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth); // Sign out from Firebase
      router.push("/login"); // Redirect to your actual login page
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="flex items-center justify-between mb-6 gap-4">
      <div className="flex items-center gap-4">
        <button
          className="md:hidden text-gray-400 hover:text-white p-2 bg-gray-800 rounded-lg"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <HiOutlineMenuAlt2 size={24} />
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-emerald-400 truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <span className="hidden sm:inline text-gray-400 text-sm">Admin User</span>
        <button
          onClick={handleLogout}
          className="bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold text-sm transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

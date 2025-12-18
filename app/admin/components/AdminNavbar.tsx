"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/firebaseConfig";

interface AdminNavbarProps {
  title?: string;
}

export default function AdminNavbar({ title = "Dashboard" }: AdminNavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);             // Sign out from Firebase
      router.push("/login");     // Redirect to your actual login page
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-emerald-400">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-gray-400">Admin User</span>
        <button
          onClick={handleLogout}
          className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg font-semibold transition-colors duration-300"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

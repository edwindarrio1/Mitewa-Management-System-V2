"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link"; // Added Link import

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);

      // Check for user role in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      if (userData?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center transition-colors relative"
      style={{
        backgroundImage: 'url(/online-personal-loan-financial-concept-600nw-2519190811.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay for better form visibility */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/50 via-gray-900/70 to-black/60"></div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 relative z-10"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
            Welcome Back 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Sign in to continue to <span className="font-semibold">MITEWA</span>
          </p>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500 text-sm text-center mb-3 bg-red-50 dark:bg-red-900/20 py-2 rounded-md"
          >
            {error}
          </motion.p>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          {/* New Go to Home Link inside Form area */}
          <div className="flex justify-between items-center text-sm font-medium text-gray-400 mt-2">
            <Link href="/" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
              ← Go to Home
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 mt-4"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
          Don't have an account?{" "}
          <Link href="/signup" className="text-emerald-500 hover:text-emerald-400 font-bold transition-colors">
            Sign Up
          </Link>
          <br /><br />
          © {new Date().getFullYear()} MITEWA SACCO. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white flex flex-col items-center justify-center px-6 py-12">
      {/* Hero Section */}
      <motion.div
        className="text-center max-w-3xl"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500">
          Mitewa Management System
        </h1>

        <p className="text-lg md:text-xl text-gray-300 mb-8">
          A modern digital platform to manage{" "}
          <span className="text-emerald-400 font-semibold">members, loans, savings</span> and{" "}
          <span className="text-cyan-400 font-semibold">investments</span> — built for cooperative
          efficiency, transparency, and growth.
        </p>

        <div className="flex gap-4 justify-center">
          <motion.div
            whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(16, 185, 129, 0.5)" }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href="/login"  // <-- updated login path
              className="bg-gradient-to-r from-emerald-500 to-cyan-600 text-white font-semibold py-3 px-8 rounded-xl shadow-lg transition-all duration-300"
            >
              Login as Admin
            </Link>
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="#features"
              className="border border-gray-600 py-3 px-8 rounded-xl text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-300"
            >
              Explore Features
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Features Section */}
      <motion.section
        id="features"
        className="mt-24 grid md:grid-cols-3 gap-8 w-full max-w-5xl"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        {[
          {
            title: "👥 Member Management",
            desc: "Add, view, and update member records with details on shares, savings, and contact info.",
          },
          {
            title: "💸 Loan Tracking",
            desc: "Monitor loan history, payments, and balances for each member in real time.",
          },
          {
            title: "💰 Savings & Shares",
            desc: "Track monthly contributions, arrears, and dividends seamlessly.",
          },
          {
            title: "📊 Smart Analytics",
            desc: "Visualize total savings, loans, and performance metrics across your SACCO.",
          },
          {
            title: "🔐 Secure Admin Access",
            desc: "Only verified admins can view and manage financial data with Firebase Authentication.",
          },
          {
            title: "📱 Responsive Design",
            desc: "Access your dashboard from any device — desktop, tablet, or mobile.",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 hover:bg-gray-700/70 hover:scale-105 transition-transform duration-300"
          >
            <h3 className="text-xl font-semibold mb-2 text-emerald-400">{feature.title}</h3>
            <p className="text-gray-300">{feature.desc}</p>
          </div>
        ))}
      </motion.section>

      {/* Footer */}
      <footer className="mt-24 text-gray-500 text-sm">
        © {new Date().getFullYear()} Mitewa Management System | Powered by Next.js + Firebase + Tailwind CSS
      </footer>
    </main>
  );
}

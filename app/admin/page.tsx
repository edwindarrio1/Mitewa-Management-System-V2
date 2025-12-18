"use client";

import { useEffect, useState } from "react";
import AdminLayout from "./Admin-Layout";
import {
  HiOutlineUserGroup,
  HiOutlineCurrencyDollar,
  HiOutlineChartBar,
} from "react-icons/hi";
import ProtectedAdmin from "./components/ProtectedAdmin";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState([
    {
      title: "Total Members",
      value: 0,
      icon: (
        <HiOutlineUserGroup
          size={34}
          className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
        />
      ),
    },
    {
      title: "Total Loans",
      value: 0,
      icon: (
        <HiOutlineCurrencyDollar
          size={34}
          className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
        />
      ),
    },
    {
      title: "Total Investments",
      value: 0,
      icon: (
        <HiOutlineChartBar
          size={34}
          className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]"
        />
      ),
    },
  ]);

  const [adminName] = useState("Admin"); // Static name since login is removed

  // Fetch dashboard stats from Firebase
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Total members
        const membersSnapshot = await getDocs(collection(db, "members"));
        const totalMembers = membersSnapshot.size;

        // Total loans (sum amounts)
        const loansSnapshot = await getDocs(collection(db, "loans"));
        const totalLoans = loansSnapshot.docs.reduce(
          (sum, doc) => sum + (doc.data().amount || 0),
          0
        );

        // Total investments (sum amounts)
        const investmentsSnapshot = await getDocs(
          collection(db, "investments")
        );
        const totalInvestments = investmentsSnapshot.docs.reduce(
          (sum, doc) => sum + (doc.data().amount || 0),
          0
        );

        setStats([
          { ...stats[0], value: totalMembers },
          { ...stats[1], value: totalLoans },
          { ...stats[2], value: totalInvestments },
        ]);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      }
    };

    fetchStats();
  }, []);

  return (
    <ProtectedAdmin>
      <AdminLayout>
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="
                bg-gradient-to-br from-gray-800/70 to-gray-900/40
                backdrop-blur-xl rounded-2xl p-6 
                flex items-center gap-4 
                hover:scale-105 hover:shadow-2xl hover:shadow-emerald-600/10
                transition-all duration-300 border border-gray-700/40
              "
            >
              <div className="p-3 bg-gray-900/40 rounded-xl border border-gray-700/50">
                {stat.icon}
              </div>

              <div>
                <p className="text-gray-400 text-sm">{stat.title}</p>
                <p className="text-3xl font-extrabold text-white">
                  {stat.value.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Welcome Message */}
        <div
          className="
            mt-12 
            bg-gradient-to-br from-gray-800/60 to-gray-900/40 
            backdrop-blur-xl rounded-2xl p-8 
            text-gray-300 border border-gray-700/30
            shadow-lg shadow-emerald-500/5
          "
        >
          <h2 className="text-2xl font-bold text-emerald-400 mb-2 tracking-wide drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]">
            Welcome, {adminName}!
          </h2>

          <p className="leading-relaxed text-gray-300/90">
            This dashboard allows you to manage members, track loans, view
            savings and shares, monitor investments, and maintain expenses — all
            in one secure, easy-to-use platform.
          </p>
        </div>
      </AdminLayout>
    </ProtectedAdmin>
  );
}

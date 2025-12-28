"use client";

import { useEffect, useState } from "react";
import AdminLayout from "./Admin-Layout";
import ProtectedAdmin from "./components/ProtectedAdmin";
import { collection, getDocs, doc, getDoc, query, where, collectionGroup } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase/firebaseConfig";
import {
  HiOutlineUserGroup,
  HiOutlineCurrencyDollar,
  HiOutlineChartBar,
  HiOutlineChat,
  HiOutlineDocumentText
} from "react-icons/hi";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState([
    {
      title: "Total Members",
      value: 0,
      icon: <HiOutlineUserGroup size={34} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />,
    },
    {
      title: "Total Loans",
      value: 0,
      icon: <HiOutlineCurrencyDollar size={34} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />,
    },
    {
      title: "Total Savings",
      value: 0,
      icon: <HiOutlineChartBar size={34} className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />,
    },
    {
      title: "Pending Requests",
      value: 0,
      icon: <HiOutlineDocumentText size={34} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />,
    },
    {
      title: "Unread Messages",
      value: 0,
      icon: <HiOutlineChat size={34} className="text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]" />,
    }
  ]);

  const [adminName, setAdminName] = useState("Admin");

  // Fetch admin name
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setAdminName(userData.name || userData.fullName || user.displayName || user.email || "Admin");
          } else {
            setAdminName(user.displayName || user.email || "Admin");
          }
        } catch (error) {
          console.error("Error fetching admin name:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch dashboard stats from Firebase
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 1. Total members
        const membersSnapshot = await getDocs(collection(db, "members"));
        const totalMembers = membersSnapshot.size;

        // 2. Total loans (sum amounts)
        const loansSnapshot = await getDocs(collection(db, "loans"));
        const totalLoans = loansSnapshot.docs.reduce(
          (sum, doc) => sum + (doc.data().amount || 0),
          0
        );

        // 3. Total Savings (sum all 'savings' subcollection docs via collectionGroup)
        const savingsSnapshot = await getDocs(collectionGroup(db, "savings"));
        const totalSavings = savingsSnapshot.docs.reduce(
          (sum, doc) => sum + (doc.data().amount || 0),
          0
        );

        // 4. Pending Loan Requests
        const pendingReqQuery = query(collection(db, "loanRequests"), where("status", "==", "pending"));
        const pendingReqSnap = await getDocs(pendingReqQuery);
        const pendingRequests = pendingReqSnap.size;

        // 5. Unread Messages (Client-side filter to avoid index error)
        const msgQuery = query(collection(db, "chats"), where("status", "==", "sent"));
        const msgSnap = await getDocs(msgQuery);
        const unreadMessages = msgSnap.docs.filter(d => d.data().senderId !== "admin").length;

        setStats([
          { ...stats[0], value: totalMembers },
          { ...stats[1], value: totalLoans },
          { ...stats[2], value: totalSavings },
          { ...stats[3], value: pendingRequests },
          { ...stats[4], value: unreadMessages },
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
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {stats.map((stat) => (
              <div
                key={stat.title}
                className="
                  bg-gradient-to-br from-gray-800/70 to-gray-900/40
                  backdrop-blur-xl rounded-2xl p-4 md:p-6 
                  flex items-center gap-4 
                  hover:scale-105 hover:shadow-2xl hover:shadow-emerald-600/10
                  transition-all duration-300 border border-gray-700/40
                "
              >
                <div className="p-3 bg-gray-900/40 rounded-xl border border-gray-700/50 shrink-0">
                  {stat.icon}
                </div>

                <div className="min-w-0">
                  <p className="text-gray-400 text-xs md:text-sm truncate">{stat.title}</p>
                  <p className="text-2xl md:text-3xl font-extrabold text-white">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Welcome Message */}
          <div
            className="
              mt-8 md:mt-12 
              bg-gradient-to-br from-gray-800/60 to-gray-900/40 
              backdrop-blur-xl rounded-2xl p-6 md:p-8 
              text-gray-300 border border-gray-700/30
              shadow-lg shadow-emerald-500/5
            "
          >
            <h2 className="text-xl md:text-2xl font-bold text-emerald-400 mb-2 tracking-wide drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]">
              Welcome, {adminName}!
            </h2>

            <p className="leading-relaxed text-gray-300/90 text-sm md:text-base">
              This dashboard allows you to manage members, track loans, view
              savings and shares, monitor investments, and maintain expenses — all
              in one secure, easy-to-use platform.
            </p>
          </div>
        </div>
      </AdminLayout>
    </ProtectedAdmin>
  );
}

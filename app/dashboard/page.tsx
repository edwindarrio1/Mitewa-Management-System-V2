"use client";

import { useEffect, useState } from "react";
import UserLayout from "./User-Layout";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, limit, onSnapshot } from "firebase/firestore";
import { HiOutlineCurrencyDollar, HiOutlineChartBar, HiOutlineTrendingUp, HiOutlineChat } from "react-icons/hi";

export default function UserDashboard() {
    const [summary, setSummary] = useState({
        totalShares: 0,
        totalLoans: 0,
        activeLoans: 0,
        unreadCount: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // 1. Find Member Document (Robust Lookup)
                    let memberDoc = null;
                    const uidQuery = query(collection(db, "members"), where("uid", "==", user.uid), limit(1));
                    const uidSnap = await getDocs(uidQuery);

                    if (!uidSnap.empty) {
                        memberDoc = uidSnap.docs[0];
                    } else if (user.email) {
                        const emailQuery = query(collection(db, "members"), where("email", "==", user.email), limit(1));
                        const emailSnap = await getDocs(emailQuery);
                        if (!emailSnap.empty) {
                            memberDoc = emailSnap.docs[0];
                        }
                    }

                    if (memberDoc) {
                        const memberData = memberDoc.data();
                        const memberId = memberDoc.id;
                        const shares = memberData.amountOfShares || 0;

                        // 2. Fetch Loans using correct memberId
                        // Query loans where memberId matches the Firestore Document ID of the member
                        const loanQuery = query(collection(db, "loans"), where("memberId", "==", memberId));
                        const loanSnap = await getDocs(loanQuery);
                        let loanAmount = 0;
                        let activeCount = 0;

                        loanSnap.forEach(doc => {
                            const data = doc.data();
                            // Ensure numbers
                            const bal = parseFloat(data.balance) || 0;
                            loanAmount += bal;
                            if (bal > 0) activeCount++;
                        });

                        // 3. Real-time listener for chat notifications (using Auth UID)
                        const chatQuery = query(collection(db, "chats"), where("userId", "==", user.uid));
                        onSnapshot(chatQuery, (snapshot) => {
                            const unread = snapshot.docs.filter(doc => {
                                const data = doc.data();
                                return data.senderId === "admin" && data.status === "sent";
                            }).length;
                            setSummary(prev => ({ ...prev, unreadCount: unread }));
                        });

                        setSummary(prev => ({
                            ...prev,
                            totalShares: shares,
                            totalLoans: loanAmount,
                            activeLoans: activeCount,
                        }));
                    }
                } catch (error) {
                    console.error("Error fetching summary:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const cards = [
        { title: "Total Shares", value: `KES ${summary.totalShares.toLocaleString()}`, icon: <HiOutlineTrendingUp size={24} />, color: "bg-emerald-500/10 text-emerald-500" },
        { title: "Loan Balance", value: `KES ${summary.totalLoans.toLocaleString()}`, icon: <HiOutlineCurrencyDollar size={24} />, color: "bg-rose-500/10 text-rose-500" },
        { title: "Active Loans", value: summary.activeLoans, icon: <HiOutlineChartBar size={24} />, color: "bg-cyan-500/10 text-cyan-500" },
        { title: "New Messages", value: summary.unreadCount, icon: <HiOutlineChat size={24} />, color: "bg-purple-500/10 text-purple-500" },
    ];

    return (
        <UserLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Welcome, {auth.currentUser?.email?.split('@')[0]}</h1>
                <p className="text-slate-400 mt-2">Here is your financial overview.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {cards.map((card, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${card.color}`}>
                                {card.icon}
                            </div>
                        </div>
                        <h3 className="text-slate-400 text-sm font-medium">{card.title}</h3>
                        <p className="text-2xl font-bold mt-1">{card.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                <div className="flex flex-wrap gap-4">
                    <a href="/dashboard/loans/request" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl transition-all inline-block text-center">
                        Request Loan
                    </a>
                    <a href="/dashboard/chat" className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-xl transition-all inline-block text-center">
                        Contact Admin
                    </a>
                </div>
            </div>
        </UserLayout>
    );
}

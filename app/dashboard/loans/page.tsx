"use client";

import { useEffect, useState } from "react";
import UserLayout from "../User-Layout";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

interface Loan {
    id: string;
    date: string;
    amount: number;
    interest: number;
    paid: number;
    balance: number;
    deadline: string;
}

export default function UserLoansPage() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    let memberId = "";

                    // 1. Try finding member by UID (most reliable, linked accounts)
                    const uidQuery = query(
                        collection(db, "members"),
                        where("uid", "==", user.uid)
                    );
                    const uidSnap = await getDocs(uidQuery);

                    if (!uidSnap.empty) {
                        memberId = uidSnap.docs[0].id;
                    } else if (user.email) {
                        // 2. Fallback: Try finding by Email (legacy/invited accounts not yet linked with uid)
                        const emailQuery = query(
                            collection(db, "members"),
                            where("email", "==", user.email)
                        );
                        const emailSnap = await getDocs(emailQuery);
                        if (!emailSnap.empty) {
                            memberId = emailSnap.docs[0].id;
                        }
                    }

                    if (memberId) {
                        const q = query(
                            collection(db, "loans"),
                            where("memberId", "==", memberId)
                        );
                        const snapshot = await getDocs(q);
                        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
                        setLoans(data);
                    } else {
                        setLoans([]);
                        console.log("No member record found for this user.");
                    }
                } catch (error) {
                    console.error("Error fetching loans:", error);
                }
            } else {
                setLoans([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <UserLayout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">My Loans</h1>
                <p className="text-slate-400">View and track your loan repayments.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/50 text-slate-300 text-sm uppercase">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Interest</th>
                                <th className="px-6 py-4">Paid</th>
                                <th className="px-6 py-4">Balance</th>
                                <th className="px-6 py-4">Deadline</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loans.length > 0 ? (
                                loans.map((loan) => (
                                    <tr key={loan.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium">{loan.date || '-'}</td>
                                        <td className="px-6 py-4">KES {(loan.amount || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4">KES {(loan.interest || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-emerald-400">KES {(loan.paid || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-rose-400 font-bold">KES {(loan.balance || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4">{loan.deadline || '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                                        {loading ? "Loading your loans..." : "No active loans found."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </UserLayout>
    );
}

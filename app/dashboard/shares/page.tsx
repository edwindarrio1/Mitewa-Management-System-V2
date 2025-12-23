"use client";

import { useEffect, useState } from "react";
import UserLayout from "../User-Layout";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

interface ShareData {
    id: string;
    period: string;
    noOfShares: number;
    amountOfShares: number;
    dividend: number;
    netPayAmount: number;
}

interface SavingTransaction {
    id: string;
    date: string;
    amount: number;
    interest: number;
    balance: number;
    dueDate?: string;
}

export default function UserSharesPage() {
    const [shares, setShares] = useState<ShareData[]>([]);
    const [transactions, setTransactions] = useState<SavingTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    let memberDoc = null;

                    // 1. Try finding member by UID
                    const uidQuery = query(
                        collection(db, "members"),
                        where("uid", "==", user.uid)
                    );
                    const uidSnap = await getDocs(uidQuery);

                    if (!uidSnap.empty) {
                        memberDoc = uidSnap.docs[0];
                    } else if (user.email) {
                        // 2. Fallback: Try finding by Email
                        const emailQuery = query(
                            collection(db, "members"),
                            where("email", "==", user.email)
                        );
                        const emailSnap = await getDocs(emailQuery);
                        if (!emailSnap.empty) {
                            memberDoc = emailSnap.docs[0];
                        }
                    }

                    if (memberDoc) {
                        const memberId = memberDoc.id;

                        // Set share summary data
                        setShares([{ id: memberId, ...memberDoc.data() } as ShareData]);

                        // 2. Get Savings Sub-collection
                        const qSavings = collection(db, "members", memberId, "savings");
                        const snapshotSavings = await getDocs(qSavings);
                        const savingsList: SavingTransaction[] = [];
                        snapshotSavings.forEach(doc => {
                            savingsList.push({ id: doc.id, ...doc.data() } as SavingTransaction);
                        });

                        // Sort by date descending
                        savingsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        setTransactions(savingsList);
                    } else {
                        setShares([]);
                        setTransactions([]);
                    }
                } catch (error) {
                    console.error("Error fetching shares/savings:", error);
                }
            } else {
                setShares([]);
                setTransactions([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <UserLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold">My Savings</h1>
                <p className="text-slate-400">Track your individual savings contributions.</p>
            </div>

            {/* SAVINGS TRANSACTIONS TABLE */}
            <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">Savings Transactions</h2>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl mb-8">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/50 text-slate-300 text-sm uppercase">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Due Date</th>
                                <th className="px-6 py-4">Contribution</th>
                                <th className="px-6 py-4">Interest Earned</th>
                                <th className="px-6 py-4 text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {transactions.length > 0 ? (
                                transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium">{t.date || '-'}</td>
                                        <td className="px-6 py-4 text-slate-400">{t.dueDate || '-'}</td>
                                        <td className="px-6 py-4 text-emerald-400 font-medium">KES {(t.amount || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-emerald-300/80">KES {(t.interest || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-bold text-white">KES {(t.balance || 0).toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                                        {loading ? "Loading transactions..." : "No savings transactions found."}
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

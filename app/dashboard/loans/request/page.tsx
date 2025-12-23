"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UserLayout from "../../User-Layout";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { HiOutlineCurrencyDollar } from "react-icons/hi";

export default function RequestLoanPage() {
    const [amount, setAmount] = useState("");
    const [purpose, setPurpose] = useState("");
    const [duration, setDuration] = useState("1"); // months
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!auth.currentUser) throw new Error("Not authenticated");

            await addDoc(collection(db, "loanRequests"), {
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                amount: parseFloat(amount),
                purpose,
                duration: parseInt(duration),
                status: "pending",
                createdAt: serverTimestamp(),
            });

            alert("Loan request submitted successfully!");
            router.push("/dashboard/loans");
        } catch (error) {
            console.error("Error regarding loan request:", error);
            alert("Failed to submit request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <UserLayout>
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <HiOutlineCurrencyDollar className="text-emerald-500" />
                        Request a Loan
                    </h1>
                    <p className="text-slate-400 mt-2">Fill in the details below to request a new loan.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-lg">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-slate-300 font-medium mb-2">Loan Amount (KES)</label>
                            <input
                                type="number"
                                required
                                min="100"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="e.g. 50000"
                            />
                        </div>

                        <div>
                            <label className="block text-slate-300 font-medium mb-2">Purpose of Loan</label>
                            <textarea
                                required
                                rows={3}
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="e.g. School fees, Business expansion..."
                            />
                        </div>

                        <div>
                            <label className="block text-slate-300 font-medium mb-2">Repayment Period (Months)</label>
                            <select
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {[1, 2, 3, 6, 12, 18, 24, 36].map(m => (
                                    <option key={m} value={m}>{m} Month{m > 1 ? 's' : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20"
                            >
                                {loading ? "Submitting Request..." : "Submit Loan Request"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </UserLayout>
    );
}

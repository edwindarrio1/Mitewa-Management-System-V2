"use client";

import { useEffect, useState } from "react";
import UserLayout from "../User-Layout";
import { db } from "@/lib/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function UserReportsPage() {
    const [year, setYear] = useState("2024/2025");
    const [reportContent, setReportContent] = useState("");
    const [loading, setLoading] = useState(true);

    const getPeriodId = (period: string) => period.replace(/\//g, "-");
    const reportDocId = `treasurer_report_${getPeriodId(year)}`;

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, "reports", reportDocId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setReportContent(docSnap.data().content || "");
                } else {
                    setReportContent("<p className='text-center p-10 text-slate-500'>No report found for this period.</p>");
                }
            } catch (err) {
                console.error("Error loading:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [year]);

    return (
        <UserLayout>
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Treasury Reports</h1>
                    <p className="text-slate-400">Official financial statements and reports.</p>
                </div>

                <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="2023/2024">2023/2024</option>
                    <option value="2024/2025">2024/2025</option>
                </select>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-2xl min-h-[600px] overflow-auto">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <article
                        className="prose prose-emerald max-w-none text-slate-900"
                        dangerouslySetInnerHTML={{ __html: reportContent }}
                    />
                )}
            </div>
        </UserLayout>
    );
}

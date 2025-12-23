"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../Admin-Layout";
import { db } from "@/lib/firebase/firebaseConfig";
import { collection, query, getDocs, setDoc, doc, updateDoc } from "firebase/firestore";
import { DEFAULT_MEMBERS } from "../components/defaultMembers";
import { HiOutlineUserAdd, HiOutlineMail, HiOutlineCheckCircle } from "react-icons/hi";

export default function AdminToolsPage() {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [emails, setEmails] = useState<{ [key: string]: string }>({});
    const [status, setStatus] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const fetchMembers = async () => {
            const q = query(collection(db, "members"));
            const snap = await getDocs(q);
            const firestoreMembers = snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));

            // Merge local default members with firestore status
            const merged = DEFAULT_MEMBERS.map(m => {
                const fsMatch = firestoreMembers.find((fm: any) => fm.name === m.name);
                return { ...m, ...fsMatch, exists: !!fsMatch };
            });

            setMembers(merged);
            setLoading(false);
        };
        fetchMembers();
    }, []);

    const handleSync = async (member: any) => {
        try {
            const memberId = member.id || crypto.randomUUID();
            await setDoc(doc(db, "members", memberId), {
                ...member,
                period: "2024/2025",
                noOfShares: member.noOfShares || 0,
                amountOfShares: member.amountOfShares || 0,
                dividend: member.dividend || 0,
                netPayAmount: member.netPayAmount || 0,
            }, { merge: true });

            setStatus(prev => ({ ...prev, [member.name]: "✅ Synced" }));
        } catch (err) {
            console.error(err);
        }
    };

    const handleInvite = async (member: any) => {
        const email = emails[member.name];
        if (!email) {
            alert("Please enter an email first");
            return;
        }

        setStatus(prev => ({ ...prev, [member.name]: "⌛ Processing..." }));

        // This is a placeholder for the logic. Since we can't create Auth accounts 
        // for OTHER people easily from client-side without logging out, 
        // we will instead save the 'email' and 'pending_activation' status to the member doc.
        // Then the user can just use the "Signup" page with that email, 
        // and we will link them automatically.

        try {
            const memberRef = doc(db, "members", member.firestoreId || member.id);
            await updateDoc(memberRef, {
                email: email,
                inviteStatus: "invited"
            });
            setStatus(prev => ({ ...prev, [member.name]: "📧 Invited" }));
        } catch (err) {
            setStatus(prev => ({ ...prev, [member.name]: "❌ Error" }));
        }
    };

    return (
        <AdminLayout>
            <div className="p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Admin Tools</h1>
                    <p className="text-gray-400">Manage your 24 default members and invite them to the platform.</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-800 text-gray-300 text-sm uppercase">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Database Status</th>
                                <th className="px-6 py-4">Email Address</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {members.map((m) => (
                                <tr key={m.name} className="hover:bg-gray-800/30">
                                    <td className="px-6 py-4 font-bold text-emerald-400">{m.name}</td>
                                    <td className="px-6 py-4">
                                        {m.exists ? (
                                            <span className="text-emerald-500 flex items-center gap-1"><HiOutlineCheckCircle /> Online</span>
                                        ) : (
                                            <button
                                                onClick={() => handleSync(m)}
                                                className="text-amber-500 hover:underline text-sm"
                                            >
                                                Sync to Firestore
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <HiOutlineMail />
                                            <input
                                                type="email"
                                                placeholder="Enter email..."
                                                value={emails[m.name] || m.email || ""}
                                                onChange={(e) => setEmails(prev => ({ ...prev, [m.name]: e.target.value }))}
                                                className="bg-transparent border-b border-gray-700 outline-none focus:border-emerald-500 transition-colors w-48 text-sm"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold">
                                        <button
                                            onClick={() => handleInvite(m)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all"
                                        >
                                            <HiOutlineUserAdd /> {status[m.name] || "Invite"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}

"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../Admin-Layout";
import { db } from "@/lib/firebase/firebaseConfig";
import { collection, addDoc, getDocs, query, where, updateDoc, doc, orderBy } from "firebase/firestore";
import { HiOutlineUserAdd, HiOutlineMail } from "react-icons/hi";

interface InviteForm {
    memberId: string;
    email: string;
}

interface Member {
    id: string;
    name: string;
    amountOfShares: number;
    email?: string;
}

export default function InviteUsersPage() {
    const [form, setForm] = useState<InviteForm>({
        memberId: "",
        email: "",
    });
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                // Fetch members who typically don't have an email yet or aren't invited
                // For simplicity, we fetch all and let admin choose, 
                // but ideally filter out those already invited if needed.
                const q = query(collection(db, "members"));
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Member));
                // Sort by name
                data.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                setMembers(data);
            } catch (error) {
                console.error("Error fetching members:", error);
            }
        };
        fetchMembers();
    }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            if (!form.memberId) {
                setMessage("Please select a member.");
                setLoading(false);
                return;
            }

            // Check if email is already used by another member
            const emailQuery = query(
                collection(db, "members"),
                where("email", "==", form.email)
            );
            const existingEmails = await getDocs(emailQuery);

            // If found, ensure it's not the same member we are trying to invite (update)
            const emailUsed = existingEmails.docs.some(d => d.id !== form.memberId);

            if (emailUsed) {
                setMessage("A member with this email already exists!");
                setLoading(false);
                return;
            }

            // Update existing member
            await updateDoc(doc(db, "members", form.memberId), {
                email: form.email,
                inviteStatus: "sent",
                invitedAt: new Date().toISOString(),
                // Keep existing data, just add email/invite info
            });

            const selectedMember = members.find(m => m.id === form.memberId);
            setMessage(`✅ Successfully invited ${selectedMember?.name}! They can now sign up with ${form.email}.`);

            // Reset form
            setForm({
                memberId: "",
                email: "",
            });

        } catch (error) {
            console.error("Error inviting user:", error);
            setMessage("❌ Failed to invite user. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-emerald-400">
                        <HiOutlineUserAdd size={36} />
                        Invite User
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Select an existing member to invite. They'll be able to sign up using their email and access their data.
                    </p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-lg">
                    <form onSubmit={handleInvite} className="space-y-6">
                        <div>
                            <label className="block text-gray-300 font-medium mb-2">
                                Select Member *
                            </label>
                            <select
                                required
                                value={form.memberId}
                                onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                            >
                                <option value="">-- Select a Member --</option>
                                {members.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name} {member.email ? `(${member.email})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-300 font-medium mb-2 flex items-center gap-2">
                                <HiOutlineMail /> Email Address *
                            </label>
                            <input
                                type="email"
                                required
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                placeholder="e.g., john@example.com"
                            />
                            <p className="text-gray-500 text-sm mt-1">
                                User will sign up using this email to access their {members.find(m => m.id === form.memberId)?.name || 'account'} data.
                            </p>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl ${message.startsWith("✅")
                                ? "bg-emerald-900/20 border border-emerald-700 text-emerald-300"
                                : "bg-red-900/20 border border-red-700 text-red-300"
                                }`}>
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <HiOutlineUserAdd size={20} />
                                    Invite User
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 p-4 bg-gray-900 border border-gray-700 rounded-xl">
                        <h3 className="font-semibold text-emerald-400 mb-2">ℹ️ How it works:</h3>
                        <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
                            <li>Select an existing member from the list</li>
                            <li>Enter their email address</li>
                            <li>System links the email to the member record</li>
                            <li>When user signs up with this email, they will see their historical data</li>
                        </ol>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

"use client";

import { useState, useEffect } from "react";
import UserLayout from "../User-Layout";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { updatePassword, updateProfile, onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { HiOutlineUser, HiOutlineLockClosed, HiOutlineMail } from "react-icons/hi";

export default function ProfilePage() {
    const user = auth.currentUser;
    const [name, setName] = useState(user?.displayName || "");
    const [newPassword, setNewPassword] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setName(currentUser.displayName || "");
            }
        });
        return () => unsubscribe();
    }, []);
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setStatus(null);

        try {
            // Update Auth Profile
            await updateProfile(user, { displayName: name });

            // Update Firestore
            await updateDoc(doc(db, "users", user.uid), {
                displayName: name,
                lastUpdated: new Date().toISOString()
            });

            setStatus({ type: "success", msg: "Profile updated successfully!" });
        } catch (err: any) {
            setStatus({ type: "error", msg: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (newPassword !== confirmPassword) {
            setStatus({ type: "error", msg: "Passwords do not match" });
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            await updatePassword(user, newPassword);
            setStatus({ type: "success", msg: "Password changed successfully!" });
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            setStatus({ type: "error", msg: "Error changing password. You may need to login again to perform this sensitive action." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <UserLayout>
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Account Settings</h1>
                    <p className="text-slate-400">Manage your profile and security.</p>
                </div>

                {status && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mb-6 p-4 rounded-xl border ${status.type === "success"
                            ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                            : "bg-rose-500/10 border-rose-500/50 text-rose-400"
                            }`}
                    >
                        {status.msg}
                    </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Basic Info */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg">
                                <HiOutlineUser size={24} />
                            </div>
                            <h2 className="text-xl font-bold">Personal Info</h2>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-500 mb-1">Email (Primary)</label>
                                <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-4 py-3 rounded-xl text-slate-400">
                                    <HiOutlineMail />
                                    <span>{user?.email}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-500 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50"
                            >
                                {loading ? "Updating..." : "Save Changes"}
                            </button>
                        </form>
                    </div>

                    {/* Security */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-rose-500/20 text-rose-500 rounded-lg">
                                <HiOutlineLockClosed size={24} />
                            </div>
                            <h2 className="text-xl font-bold">Security</h2>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-500 mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-500 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-rose-500/20 disabled:opacity-50"
                            >
                                {loading ? "Updating..." : "Update Password"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </UserLayout>
    );
}

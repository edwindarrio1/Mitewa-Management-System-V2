"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../Admin-Layout";
import { db } from "../../../lib/firebase";
import {
    collection, getDocs, deleteDoc, doc,
    writeBatch, query, orderBy, setDoc, updateDoc,
    where
} from "firebase/firestore";
import {
    HiOutlineTrash, HiOutlineRefresh, HiOutlineExclamation,
    HiOutlineUserGroup, HiOutlineShieldCheck, HiOutlineCalendar,
    HiOutlineSearch, HiOutlinePencilAlt, HiOutlineSave,
    HiOutlineCheckCircle, HiOutlineXCircle
} from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";

interface Member {
    id: string;
    name: string;
    email?: string;
    uid?: string;
    createdAt?: any;
    period?: string;
    noOfShares?: number;
}

interface User {
    id: string;
    email: string;
    role: string;
    name?: string;
}

interface FinancialYear {
    id: string;
    createdAt?: any;
}

export default function MaintenancePage() {
    const [activeTab, setActiveTab] = useState<"cleanup" | "members" | "admins" | "years">("cleanup");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // Cleanup State
    const [duplicates, setDuplicates] = useState<{ [name: string]: Member[] }>({});
    const [dupeStats, setDupeStats] = useState({ total: 0, dupeGroups: 0, removable: 0 });

    // Members State
    const [allMembers, setAllMembers] = useState<Member[]>([]);
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [editEmail, setEditEmail] = useState("");

    // Admins State
    const [allUsers, setAllUsers] = useState<User[]>([]);

    // Years State
    const [allYears, setAllYears] = useState<FinancialYear[]>([]);
    const [newYear, setNewYear] = useState("");

    useEffect(() => {
        if (activeTab === "members") fetchMembersForList();
        if (activeTab === "admins") fetchUsers();
        if (activeTab === "years") fetchYears();
    }, [activeTab]);

    // --- SHARED ---
    const showMessage = (msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(""), 5000);
    };

    // --- CLEANUP LOGIC ---
    const findDuplicates = async () => {
        setLoading(true);
        setMessage("");
        setDuplicates({});

        try {
            const q = query(collection(db, "members"));
            const snapshot = await getDocs(q);
            const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Member));

            const grouped: { [name: string]: Member[] } = {};
            members.forEach(m => {
                const key = (m.name || "Unknown").trim().toUpperCase();
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(m);
            });

            const dupeMap: { [name: string]: Member[] } = {};
            let removableCount = 0;
            let groupCount = 0;

            Object.entries(grouped).forEach(([name, list]) => {
                if (list.length > 1) {
                    dupeMap[name] = list;
                    groupCount++;
                    removableCount += (list.length - 1);
                }
            });

            setDuplicates(dupeMap);
            setDupeStats({
                total: members.length,
                dupeGroups: groupCount,
                removable: removableCount
            });

            if (groupCount === 0) {
                showMessage("✅ No duplicates found! Database is clean.");
            } else {
                setMessage(`⚠️ Found ${groupCount} duplicate groups. ${removableCount} records can be removed.`);
            }

        } catch (error: any) {
            console.error(error);
            showMessage("❌ Error fetching members: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const removeDuplicates = async () => {
        if (!confirm(`Are you sure you want to delete ${dupeStats.removable} duplicate records? This cannot be undone.`)) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);
            let operationCount = 0;

            for (const [name, list] of Object.entries(duplicates)) {
                list.sort((a, b) => {
                    const aScore = (a.uid ? 10 : 0) + (a.email ? 5 : 0) + (a.noOfShares ? 1 : 0);
                    const bScore = (b.uid ? 10 : 0) + (b.email ? 5 : 0) + (b.noOfShares ? 1 : 0);
                    return bScore - aScore;
                });

                const toDelete = list.slice(1);
                for (const m of toDelete) {
                    batch.delete(doc(db, "members", m.id));
                    operationCount++;
                }
            }

            if (operationCount > 0) await batch.commit();

            showMessage(`✅ Successfully removed ${operationCount} duplicate records.`);
            setDuplicates({});
            setDupeStats({ total: 0, dupeGroups: 0, removable: 0 });
            await findDuplicates();

        } catch (error: any) {
            console.error(error);
            showMessage("❌ Error deleting records: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- MEMBERS LOGIC ---
    const fetchMembersForList = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "members"), orderBy("name"));
            const snapshot = await getDocs(q);
            setAllMembers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
        } catch (error: any) {
            showMessage("❌ Error fetching members: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteMember = async (id: string, name: string) => {
        if (!confirm(`Permanently delete member "${name}"? This will not delete their historical data (loans/savings) but they will no longer appear in member lists.`)) return;

        try {
            await deleteDoc(doc(db, "members", id));
            setAllMembers(prev => prev.filter(m => m.id !== id));
            showMessage(`✅ Member ${name} deleted.`);
        } catch (error: any) {
            showMessage("❌ Failed to delete member: " + error.message);
        }
    };

    const startEditEmail = (m: Member) => {
        setEditingMemberId(m.id);
        setEditEmail(m.email || "");
    };

    const saveMemberEmail = async (id: string) => {
        try {
            await updateDoc(doc(db, "members", id), { email: editEmail });
            setAllMembers(prev => prev.map(m => m.id === id ? { ...m, email: editEmail } : m));
            setEditingMemberId(null);
            showMessage("✅ Email updated successfully.");
        } catch (error: any) {
            showMessage("❌ Failed to update email: " + error.message);
        }
    };

    // --- ADMINS LOGIC ---
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "users"));
            const snapshot = await getDocs(q);
            setAllUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User)));
        } catch (error: any) {
            showMessage("❌ Error fetching users: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleAdminRole = async (user: User) => {
        const newRole = user.role === "admin" ? "user" : "admin";
        if (!confirm(`Are you sure you want to change ${user.email} to ${newRole}?`)) return;

        try {
            await updateDoc(doc(db, "users", user.id), { role: newRole });
            setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
            showMessage(`✅ User ${user.email} is now a ${newRole}.`);
        } catch (error: any) {
            showMessage("❌ Failed to update role: " + error.message);
        }
    };

    // --- YEARS LOGIC ---
    const fetchYears = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "financialYears"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            setAllYears(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FinancialYear)));
        } catch (error: any) {
            showMessage("❌ Error fetching financial years: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const addYear = async () => {
        if (!newYear || !newYear.includes("/")) {
            alert("Please enter a valid year format (e.g., 2024/2025)");
            return;
        }
        try {
            await setDoc(doc(db, "financialYears", newYear), {
                createdAt: new Date(),
            });
            setAllYears(prev => [{ id: newYear, createdAt: new Date() }, ...prev]);
            setNewYear("");
            showMessage("✅ Financial year added.");
        } catch (error: any) {
            showMessage("❌ Failed to add year: " + error.message);
        }
    };

    const deleteYear = async (id: string) => {
        if (!confirm(`⚠️ Are you sure you want to delete the financial year "${id}"? This will remove it from the selection list across the system.`)) return;

        setLoading(true);
        try {
            await deleteDoc(doc(db, "financialYears", id));
            setAllYears(prev => prev.filter(y => y.id !== id));
            showMessage(`✅ Financial year "${id}" deleted successfully.`);
            alert(`Financial year "${id}" has been removed.`);
        } catch (error: any) {
            console.error("Error deleting year:", error);
            showMessage("❌ Failed to delete year: " + error.message);
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Filtering
    const filteredMembers = allMembers.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.email || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredUsers = allUsers.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="max-w-6xl mx-auto p-4 sm:p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold flex items-center gap-3 text-emerald-400">
                        <HiOutlineExclamation size={36} className="text-emerald-500" />
                        System Maintenance
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Manage users, members, duplicate records, and system-wide financial data.
                    </p>
                </div>

                {/* TABS NAVIGATION */}
                <div className="flex flex-wrap gap-2 mb-6 bg-gray-800/50 p-1 rounded-2xl border border-gray-700 w-fit">
                    {[
                        { id: "cleanup", label: "Duplicates Cleanup", icon: HiOutlineTrash },
                        { id: "members", label: "Manage Members", icon: HiOutlineUserGroup },
                        { id: "admins", label: "Admin Users", icon: HiOutlineShieldCheck },
                        { id: "years", label: "Financial Years", icon: HiOutlineCalendar },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                setSearchTerm("");
                            }}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
                                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                                }`}
                        >
                            <tab.icon size={20} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${message.includes("✅")
                            ? "bg-emerald-900/20 text-emerald-300 border border-emerald-800/50"
                            : "bg-red-900/20 text-red-300 border border-red-800/50"
                            }`}
                    >
                        {message.includes("✅") ? <HiOutlineCheckCircle size={24} /> : <HiOutlineXCircle size={24} />}
                        {message}
                    </motion.div>
                )}

                <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl -mr-32 -mt-32"></div>

                    <AnimatePresence mode="wait">
                        {/* TAB: CLEANUP */}
                        {activeTab === "cleanup" && (
                            <motion.div
                                key="cleanup"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6 relative z-10"
                            >
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Duplicate Detection</h2>
                                        <p className="text-gray-400 text-sm mt-1">Scan for members with the same name across all periods.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={findDuplicates}
                                            disabled={loading}
                                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-900/20"
                                        >
                                            <HiOutlineRefresh className={loading ? "animate-spin" : ""} />
                                            {loading ? "Scanning..." : "Scan Database"}
                                        </button>

                                        {dupeStats.removable > 0 && (
                                            <button
                                                onClick={removeDuplicates}
                                                disabled={loading}
                                                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-red-900/20"
                                            >
                                                <HiOutlineTrash />
                                                Clean {dupeStats.removable} Records
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {Object.keys(duplicates).length > 0 ? (
                                    <div className="grid gap-4 mt-8">
                                        {Object.entries(duplicates).map(([name, list]) => (
                                            <div key={name} className="bg-gray-900/50 p-6 rounded-2xl border border-gray-700 group hover:border-emerald-500/30 transition-all">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-bold text-xl text-emerald-400">{name}</h4>
                                                    <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-xs font-bold border border-gray-700">
                                                        {list.length} Records Found
                                                    </span>
                                                </div>
                                                <div className="space-y-3">
                                                    {list.map((m, idx) => (
                                                        <div key={m.id} className="flex flex-wrap justify-between items-center bg-gray-900/80 p-3 rounded-xl text-sm border border-gray-800 group-hover:bg-gray-900 transition-all">
                                                            <div className="flex items-center gap-4">
                                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${idx === 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                                                                    {idx === 0 ? "Primary" : "Duplicate"}
                                                                </span>
                                                                <div>
                                                                    <p className="text-gray-300 font-mono text-xs">{m.id}</p>
                                                                    <div className="flex gap-2 mt-1">
                                                                        {m.uid && <span className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded text-[10px] border border-blue-700/50">User Account</span>}
                                                                        {m.email && <span className="text-gray-500 text-[11px] italic">{m.email}</span>}
                                                                        <span className="text-gray-600 text-[11px]">{m.period}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-gray-400 font-bold bg-gray-800/50 px-3 py-1 rounded-lg">
                                                                Shares: {m.noOfShares || 0}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    !loading && (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 border-2 border-dashed border-gray-700 rounded-3xl">
                                            <HiOutlineCheckCircle size={64} className="mb-4 text-gray-600" />
                                            <p className="text-lg font-medium">Click Scan to check for duplicate records.</p>
                                        </div>
                                    )
                                )}
                            </motion.div>
                        )}

                        {/* TAB: MEMBERS */}
                        {activeTab === "members" && (
                            <motion.div
                                key="members"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <h2 className="text-2xl font-bold text-white">Member Records</h2>
                                    <div className="relative w-full sm:w-64">
                                        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Search name or email..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-2xl border border-gray-700">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-900/50 text-gray-400 font-bold border-b border-gray-700">
                                            <tr>
                                                <th className="px-6 py-4">Name</th>
                                                <th className="px-6 py-4">Email</th>
                                                <th className="px-6 py-4 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700/50">
                                            {filteredMembers.map(m => (
                                                <tr key={m.id} className="hover:bg-gray-700/20 transition-all">
                                                    <td className="px-6 py-4 font-semibold text-gray-200">
                                                        {m.name}
                                                        <span className="ml-2 text-[10px] text-gray-600 font-mono">{m.id}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {editingMemberId === m.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    value={editEmail}
                                                                    onChange={(e) => setEditEmail(e.target.value)}
                                                                    className="bg-gray-900 border border-emerald-500/50 rounded-lg px-3 py-1 text-sm outline-none"
                                                                />
                                                                <button onClick={() => saveMemberEmail(m.id)} className="text-emerald-400 hover:text-emerald-300">
                                                                    <HiOutlineSave size={20} />
                                                                </button>
                                                                <button onClick={() => setEditingMemberId(null)} className="text-red-400">
                                                                    <HiOutlineXCircle size={20} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 group">
                                                                <span className={m.email ? "text-gray-300" : "text-gray-600 italic"}>
                                                                    {m.email || "No email linked"}
                                                                </span>
                                                                <button
                                                                    onClick={() => startEditEmail(m)}
                                                                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-emerald-400 transition-all"
                                                                >
                                                                    <HiOutlinePencilAlt size={16} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => deleteMember(m.id, m.name)}
                                                            className="text-gray-600 hover:text-red-500 transition-all"
                                                        >
                                                            <HiOutlineTrash size={20} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB: ADMINS */}
                        {activeTab === "admins" && (
                            <motion.div
                                key="admins"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <h2 className="text-2xl font-bold text-white">Registered Users & Admins</h2>
                                    <div className="relative w-full sm:w-64">
                                        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {filteredUsers.map(user => (
                                        <div key={user.id} className={`p-6 rounded-3xl border transition-all ${user.role === 'admin' ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-gray-900/40 border-gray-700'}`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`p-3 rounded-2xl ${user.role === 'admin' ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                                                    <HiOutlineShieldCheck size={24} />
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-gray-100 truncate">{user.email}</h3>
                                            <p className="text-gray-500 text-xs mt-1 font-mono">{user.id}</p>

                                            <button
                                                onClick={() => toggleAdminRole(user)}
                                                className={`w-full mt-6 py-3 rounded-xl font-bold transition-all text-sm border ${user.role === 'admin'
                                                    ? "bg-transparent border-red-900/50 text-red-400 hover:bg-red-500 hover:text-white"
                                                    : "bg-transparent border-emerald-900/50 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                                                    }`}
                                            >
                                                {user.role === 'admin' ? "Revoke Admin Access" : "Promote to Admin"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* TAB: YEARS */}
                        {activeTab === "years" && (
                            <motion.div
                                key="years"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="bg-gray-900/50 p-6 rounded-3xl border border-gray-700 shadow-inner">
                                    <h3 className="text-lg font-bold text-white mb-4">Add New Financial Year</h3>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="e.g., 2024/2025"
                                                value={newYear}
                                                onChange={(e) => setNewYear(e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <button
                                            onClick={addYear}
                                            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <HiOutlineCalendar size={20} />
                                            Add Period
                                        </button>
                                    </div>
                                    <p className="text-gray-500 text-xs mt-3 italic">ℹ️ Adding a period makes it available for selection when creating/filtering members.</p>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    {allYears.map(year => (
                                        <div key={year.id} className="bg-gray-900 border border-gray-700 p-6 rounded-3xl flex flex-col justify-between items-center group relative overflow-hidden">
                                            <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/5 transition-all"></div>
                                            <HiOutlineCalendar size={32} className="text-gray-700 mb-4" />
                                            <span className="text-xl font-black text-gray-200 group-hover:text-emerald-400 transition-colors">{year.id}</span>
                                            <button
                                                onClick={() => deleteYear(year.id)}
                                                className="mt-6 p-3 bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all"
                                                title="Remove Period"
                                            >
                                                <HiOutlineTrash size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </AdminLayout>
    );
}

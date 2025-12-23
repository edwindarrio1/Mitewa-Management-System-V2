"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { doc, setDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

export default function SignUpPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const { user } = await createUserWithEmailAndPassword(auth, email, password);

            // Initialize user record in Firestore
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: "user",
                createdAt: new Date().toISOString()
            });

            // Link to existing member record if email matches
            const memberQ = query(collection(db, "members"), where("email", "==", email));
            const memberSnap = await getDocs(memberQ);
            if (!memberSnap.empty) {
                for (const memberDoc of memberSnap.docs) {
                    await updateDoc(doc(db, "members", memberDoc.id), {
                        uid: user.uid,
                        inviteStatus: "activated"
                    });
                }
            }

            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center transition-colors relative"
            style={{
                backgroundImage: 'url(/online-personal-loan-financial-concept-600nw-2519190811.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            {/* Overlay for better form visibility */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/50 via-slate-900/70 to-black/60"></div>

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10"
            >
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-extrabold text-cyan-700 dark:text-cyan-400">
                        Create Account ✨
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Join <span className="font-semibold">MITEWA</span> as a member
                    </p>
                </div>

                {error && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-red-500 text-sm text-center mb-3 bg-red-50 dark:bg-red-900/20 py-2 rounded-md"
                    >
                        {error}
                    </motion.p>
                )}

                <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg py-2.5 font-bold transition-all duration-200 shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 mt-2"
                    >
                        {loading ? "Creating account..." : "Register Now"}
                    </button>
                </form>

                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                    Already have an account?{" "}
                    <Link href="/login" className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline">
                        Login here
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}

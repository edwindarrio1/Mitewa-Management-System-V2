"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

export default function SetupAdminPage() {
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);

    const setupAdmin = async () => {
        setLoading(true);
        setStatus("Starting setup...");
        const email = "edwinngoci@gmail.com";
        const password = "Kariuki66";

        try {
            // 1. Try to create the user
            setStatus("Creating user account...");
            let user;
            try {
                const res = await createUserWithEmailAndPassword(auth, email, password);
                user = res.user;
                setStatus("User created successfully.");
            } catch (err: any) {
                if (err.code === "auth/email-already-in-use") {
                    setStatus("User already exists, signing in...");
                    const res = await signInWithEmailAndPassword(auth, email, password);
                    user = res.user;
                    setStatus("Signed in existing user.");
                } else {
                    throw err;
                }
            }

            // 2. Set Admin role in 'users' collection
            setStatus("Setting admin role in 'users' collection...");
            await setDoc(doc(db, "users", user.uid), {
                email: email,
                role: "admin",
                createdAt: new Date().toISOString()
            }, { merge: true });

            // 3. Also create 'admin' collection document as requested
            setStatus("Adding to 'admin' collection...");
            await setDoc(doc(db, "admin", user.uid), {
                email: email,
                isAdmin: true,
                setupAt: new Date().toISOString()
            }, { merge: true });

            setStatus("✅ Admin Setup Complete! You can now login at /login");
        } catch (err: any) {
            console.error(err);
            setStatus("❌ Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
                <h1 className="text-2xl font-bold mb-6">Internal Admin Setup</h1>
                <p className="text-slate-400 mb-8 text-sm">
                    This will create the admin user <strong>edwinngoci@gmail.com</strong> and grant them admin privileges in Firestore.
                </p>

                <div className="bg-slate-800/50 rounded-xl p-4 mb-8 min-h-[60px] flex items-center justify-center">
                    <p className="text-emerald-400 text-sm font-mono">{status || "Ready to setup"}</p>
                </div>

                <button
                    onClick={setupAdmin}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20"
                >
                    {loading ? "Processing..." : "Run Admin Setup"}
                </button>
            </div>
        </div>
    );
}

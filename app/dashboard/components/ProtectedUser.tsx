"use client";

import { useEffect, useState, ReactNode } from "react";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface Props {
    children: ReactNode;
}

export default function ProtectedUser({ children }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/login");
            } else {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    const userData = userDoc.data();

                    if (userData?.role === "admin") {
                        router.push("/admin"); // Admins belong in /admin
                    } else {
                        setLoading(false);
                    }
                } catch (error) {
                    console.error("Error checking role:", error);
                    router.push("/login");
                }
            }
        });

        return () => unsubscribe();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500 rounded-full"></div>
                    <p className="text-slate-400">Loading your profile...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

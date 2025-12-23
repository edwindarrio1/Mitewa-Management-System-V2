"use client";

import { useEffect, useState, useRef } from "react";
import UserLayout from "../User-Layout";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    updateDoc,
    setDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { HiOutlinePaperAirplane, HiCheck, HiCheckCircle } from "react-icons/hi";

interface Message {
    id: string;
    text: string;
    senderId: string;
    createdAt: any;
    status?: "sent" | "read";
}

export default function UserChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isAdminTyping, setIsAdminTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        let unsubscribeSnapshot: (() => void) | null = null;
        let unsubscribeTyping: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            // Cleanup previous listeners if any
            if (unsubscribeSnapshot) unsubscribeSnapshot();
            if (unsubscribeTyping) unsubscribeTyping();

            if (user) {
                const uid = user.uid;

                // Removed orderBy("createdAt", "asc") to avoid index requirement error
                const q = query(
                    collection(db, "chats"),
                    where("userId", "==", uid)
                );

                unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                    const msgs = snapshot.docs.map(d => ({
                        id: d.id,
                        ...d.data()
                    })) as Message[];

                    // Sort messages client-side
                    msgs.sort((a, b) => {
                        const t1 = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                        const t2 = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                        return t1 - t2;
                    });

                    // Mark admin messages as read when user sees them
                    snapshot.docs.forEach(async (d) => {
                        const data = d.data();
                        if (data.senderId === "admin" && data.status !== "read") {
                            await updateDoc(doc(db, "chats", d.id), { status: "read" });
                        }
                    });

                    setMessages(msgs);
                });

                // Listen for admin typing status
                unsubscribeTyping = onSnapshot(doc(db, "typing_states", "admin_typing_for_" + uid), (d) => {
                    if (d.exists()) {
                        setIsAdminTyping(d.data().isTyping);
                    } else {
                        setIsAdminTyping(false);
                    }
                });
            } else {
                setMessages([]);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) unsubscribeSnapshot();
            if (unsubscribeTyping) unsubscribeTyping();
        };
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isAdminTyping]);

    const handleTyping = () => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;

        setDoc(doc(db, "typing_states", uid), { isTyping: true }, { merge: true });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            setDoc(doc(db, "typing_states", uid), { isTyping: false }, { merge: true });
        }, 2000);
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !auth.currentUser) return;

        try {
            await addDoc(collection(db, "chats"), {
                text: newMessage,
                senderId: auth.currentUser.uid,
                userId: auth.currentUser.uid,
                createdAt: serverTimestamp(),
                senderName: auth.currentUser.email,
                status: "sent"
            });
            setNewMessage("");
            setDoc(doc(db, "typing_states", auth.currentUser.uid), { isTyping: false }, { merge: true });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <UserLayout>
            <div className="h-[calc(100vh-120px)] flex flex-col">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold">Chat with Admin</h1>
                    <p className="text-slate-400 text-sm">Send a message to the sacco administration.</p>
                </div>

                <div className="flex-1 bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                        {messages.map((msg) => {
                            const isMe = msg.senderId === auth.currentUser?.uid;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl relative shadow-md ${isMe
                                        ? "bg-emerald-600 text-white rounded-tr-none"
                                        : "bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700"
                                        }`}>
                                        <p className="pb-3 pr-8">{msg.text}</p>
                                        <div className="flex items-center gap-1 absolute bottom-1 right-2">
                                            <span className="text-[9px] opacity-60">
                                                {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                            </span>
                                            {isMe && (
                                                msg.status === "read"
                                                    ? <HiCheckCircle className="text-blue-300" size={12} title="Read" />
                                                    : <HiCheck className="text-gray-300" size={12} title="Sent" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {isAdminTyping && (
                            <div className="flex justify-start">
                                <div className="bg-gray-800/80 backdrop-blur-sm text-emerald-400 px-4 py-2 rounded-2xl rounded-tl-none text-xs flex items-center gap-2 border border-gray-700 shadow-lg">
                                    <span className="animate-bounce">●</span>
                                    <span className="animate-bounce delay-75">●</span>
                                    <span className="animate-bounce delay-150">●</span>
                                    Admin is typing...
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>

                    <form onSubmit={sendMessage} className="p-4 bg-gray-900 border-t border-gray-800 flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value);
                                handleTyping();
                            }}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                        <button
                            type="submit"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20"
                        >
                            <HiOutlinePaperAirplane size={24} className="rotate-90" />
                        </button>
                    </form>
                </div>
            </div>
        </UserLayout>
    );
}

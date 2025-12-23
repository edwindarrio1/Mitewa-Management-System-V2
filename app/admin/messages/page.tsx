"use client";

import { useEffect, useState, useRef } from "react";
import AdminLayout from "../Admin-Layout";
import { db } from "@/lib/firebase/firebaseConfig";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    setDoc
} from "firebase/firestore";
import { HiOutlinePaperAirplane, HiCheck, HiCheckCircle } from "react-icons/hi";

interface Message {
    id: string;
    text: string;
    senderId: string;
    userId: string;
    senderName: string;
    createdAt: any;
    status?: "sent" | "read";
}

export default function AdminMessagesPage() {
    const [chats, setChats] = useState<{ [key: string]: Message[] }>({});
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [userTypingStates, setUserTypingStates] = useState<{ [key: string]: boolean }>({});
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const q = query(collection(db, "chats"), orderBy("createdAt", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const grouped: { [key: string]: Message[] } = {};
            snapshot.docs.forEach(d => {
                const data = d.data() as Message;
                const userId = data.userId;
                if (!grouped[userId]) grouped[userId] = [];
                grouped[userId].push({ ...data, id: d.id });

                // Mark user messages as read if this user is currently selected
                if (selectedUserId === userId && data.senderId !== "admin" && data.status !== "read") {
                    updateDoc(doc(db, "chats", d.id), { status: "read" });
                }
            });
            setChats(grouped);
        });

        // Listen for all typing states
        const typingUnsubscribe = onSnapshot(collection(db, "typing_states"), (snapshot) => {
            const states: { [key: string]: boolean } = {};
            snapshot.docs.forEach(d => {
                states[d.id] = d.data().isTyping;
            });
            setUserTypingStates(states);
        });

        return () => {
            unsubscribe();
            typingUnsubscribe();
        };
    }, [selectedUserId]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedUserId, chats]);

    const handleTyping = () => {
        if (!selectedUserId) return;
        // Indicator for the specific user we are replying to
        const indicatorId = "admin_typing_for_" + selectedUserId;
        setDoc(doc(db, "typing_states", indicatorId), { isTyping: true }, { merge: true });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            setDoc(doc(db, "typing_states", indicatorId), { isTyping: false }, { merge: true });
        }, 2000);
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUserId) return;

        try {
            await addDoc(collection(db, "chats"), {
                text: newMessage,
                senderId: "admin",
                userId: selectedUserId,
                createdAt: serverTimestamp(),
                senderName: "Administrator",
                status: "sent"
            });
            setNewMessage("");
            setDoc(doc(db, "typing_states", "admin_typing_for_" + selectedUserId), { isTyping: false }, { merge: true });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <AdminLayout>
            <div className="h-[calc(100vh-100px)] flex gap-6 bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
                {/* Sidebar: Chat List */}
                <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-900/50">
                    <div className="p-4 border-b border-gray-800 bg-gray-900">
                        <h2 className="text-xl font-bold text-white">Inbox</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {Object.keys(chats).length > 0 ? (
                            Object.entries(chats).map(([userId, msgs]) => {
                                const lastMsg = msgs[msgs.length - 1];
                                const hasUnread = msgs.some(m => m.senderId !== "admin" && m.status !== "read");
                                return (
                                    <button
                                        key={userId}
                                        onClick={() => setSelectedUserId(userId)}
                                        className={`w-full p-4 text-left hover:bg-gray-800/50 transition-colors border-b border-gray-800/50 relative ${selectedUserId === userId ? "bg-gray-800 shadow-inner" : ""
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="font-bold text-emerald-400 truncate flex-1">
                                                {msgs[0]?.senderName?.split('@')[0] || "User Login"}
                                            </p>
                                            <span className="text-[10px] text-gray-500">
                                                {lastMsg?.createdAt?.toDate ? lastMsg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                            </span>
                                        </div>
                                        <p className={`text-sm truncate ${hasUnread ? "text-white font-bold" : "text-gray-400"}`}>
                                            {lastMsg?.text}
                                        </p>
                                        {userTypingStates[userId] && (
                                            <p className="text-[10px] text-emerald-500 animate-pulse mt-1">Typing...</p>
                                        )}
                                        {hasUnread && !userTypingStates[userId] && (
                                            <div className="absolute right-4 bottom-4 w-2 h-2 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"></div>
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-10 text-center">
                                <p className="text-gray-500 text-sm italic">No active conversations</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className="flex-1 flex flex-col bg-gray-900">
                    {selectedUserId ? (
                        <>
                            <div className="p-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-emerald-400">
                                        {chats[selectedUserId][0]?.senderName || "User Chat"}
                                    </h3>
                                    {userTypingStates[selectedUserId] && (
                                        <p className="text-xs text-emerald-500 animate-pulse">User is typing...</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                                {chats[selectedUserId].map((msg) => {
                                    const isAdmin = msg.senderId === "admin";
                                    return (
                                        <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[75%] px-4 py-2 rounded-2xl relative shadow-md ${isAdmin
                                                    ? "bg-emerald-600 text-white rounded-tr-none"
                                                    : "bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700"
                                                }`}>
                                                <p className="pb-3 pr-8">{msg.text}</p>
                                                <div className="flex items-center gap-1 absolute bottom-1 right-2">
                                                    <span className="text-[9px] opacity-60">
                                                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                                    </span>
                                                    {isAdmin && (
                                                        msg.status === "read"
                                                            ? <HiCheckCircle className="text-blue-300" size={12} />
                                                            : <HiCheck className="text-gray-300" size={12} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-3xl">💬</div>
                            <p>Select a message to start chatting</p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

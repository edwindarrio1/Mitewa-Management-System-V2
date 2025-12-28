"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../Admin-Layout";
import { DEFAULT_MEMBERS } from "../components/defaultMembers";
import * as XLSX from "xlsx";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  setDoc,
  doc,
  query
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { FaPlus, FaTrash, FaSave, FaFileExport, FaFileImport } from "react-icons/fa";

interface MemberData {
  id: string;
  name: string;
}

interface Saving {
  id?: string;
  memberId: string;
  date: string;
  dueDate?: string; // NEW FIELD
  amount: number;
  interest: number;
  balance: number;
}

export default function SavingsPage() {
  const [members, setMembers] = useState<MemberData[]>([]); // Initialize empty
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [savings, setSavings] = useState<Saving[]>([]);

  const toNumber = (value: any) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/[^0-9.-]/g, "");
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  // --------------------------------------------------------
  // UPDATED recalc() — interest only applies when dueDate is reached
  // --------------------------------------------------------
  const recalc = (saving: Saving) => {
    const amount = toNumber(saving.amount);

    if (!saving.dueDate) {
      // If no due date, interest = 0
      return { ...saving, interest: 0, balance: amount };
    }

    const today = new Date();
    const due = new Date(saving.dueDate);

    // Interest applies ONLY when today's date >= due date
    const interest = today >= due ? amount * 0.1 : 0;
    const balance = amount + interest;

    return { ...saving, interest, balance };
  };

  // Load Members from Database
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const q = query(collection(db, "members"));
        const snapshot = await getDocs(q);
        const membersData: MemberData[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "Unknown",
        }));

        // Sort by name
        membersData.sort((a, b) => a.name.localeCompare(b.name));

        setMembers(membersData);
        if (membersData.length > 0) {
          setSelectedMemberId(membersData[0].id);
        }
      } catch (error) {
        console.error("Error loading members:", error);
      }
    };
    loadMembers();
  }, []);

  const loadSavings = async () => {
    if (!selectedMemberId) return;
    const q = collection(db, "members", selectedMemberId, "savings");
    const snapshot = await getDocs(q);
    const data: Saving[] = [];
    snapshot.forEach((doc) => data.push({ id: doc.id, ...(doc.data() as Saving) }));
    setSavings(data.map(recalc));
  };

  useEffect(() => {
    loadSavings();
  }, [selectedMemberId]);

  const handleSavingChange = (id: string, field: keyof Saving, value: any) => {
    setSavings((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = {
          ...s,
          [field]: field === "date" || field === "dueDate" ? value : toNumber(value),
        };
        return recalc(updated);
      })
    );
  };

  const addSavingRow = () => {
    if (!selectedMemberId) return;
    setSavings((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        memberId: selectedMemberId,
        date: "",
        dueDate: "", // NEW FIELD
        amount: 0,
        interest: 0,
        balance: 0,
      },
    ]);
  };

  const saveSavings = async () => {
    for (const s of savings) {
      if (s.id) {
        await setDoc(doc(db, "members", selectedMemberId, "savings", s.id), s);
      } else {
        await addDoc(collection(db, "members", selectedMemberId, "savings"), s);
      }
    }
    alert("Saved!");
  };

  const deleteSaving = async (id: string) => {
    await deleteDoc(doc(db, "members", selectedMemberId, "savings", id));
    setSavings((prev) => prev.filter((s) => s.id !== id));
  };

  // UPDATED: Now uses member name in filename
  const exportExcel = () => {
    const memberName = members.find((m) => m.id === selectedMemberId)?.name || "Unknown_Member";
    // Sanitize filename
    const safeName = memberName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    const dataToExport = savings.map((s) => ({
      MEMBER: memberName,
      DATE: s.date,
      DUE_DATE: s.dueDate || "",
      AMOUNT: s.amount,
      INTEREST: s.interest,
      BALANCE: s.balance,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Savings");
    XLSX.writeFile(workbook, `${safeName}_savings.xlsx`);
  };

  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet);

      const importedSavings: Saving[] = json
        .filter((row) => row["MEMBER"] || row["member"] || row["Member"] || row["NAME"] || row["name"])
        .map((row) =>
          recalc({
            id: crypto.randomUUID(),
            memberId: members.find((m) =>
              m.name.toLowerCase() === String(row.MEMBER || row.member || row.Member || row.NAME || row.name || "").toLowerCase()
            )?.id || selectedMemberId,
            date: row.DATE || row.date || row.Date || "",
            dueDate: row.DUE_DATE || row.due_date || row.DueDate || row["DUE DATE"] || "",
            amount: toNumber(row.AMOUNT || row.amount || row.Amount),
            interest: toNumber(row.INTEREST || row.interest || row.Interest),
            balance: 0,
          })
        );

      if (importedSavings.length === 0) {
        alert("No valid data found in the Excel file.");
        return;
      }

      setSavings(importedSavings);
      alert(`Imported ${importedSavings.length} records. Click 'Save' to persist.`);
    } catch (err) {
      console.error("Import failed:", err);
      alert("Failed to import Excel file.");
    } finally {
      e.target.value = "";
    }
  };

  const buttonClasses =
    "px-4 py-2 rounded flex items-center gap-2 text-white transform transition-transform duration-150 hover:scale-105 active:scale-95";

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">

        {/* Member Select */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <label className="text-gray-300 font-medium shrink-0">Select Member:</label>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="bg-gray-700 text-gray-200 px-4 py-2 rounded-lg w-full sm:w-72 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          >
            {members.length === 0 && <option>Loading members...</option>}
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 md:gap-3 mb-6">
          <button
            onClick={addSavingRow}
            className="flex-1 sm:flex-none justify-center bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 text-white font-semibold transition-all active:scale-95 text-sm"
          >
            <FaPlus /> Contribution
          </button>
          <button
            onClick={saveSavings}
            className="flex-1 sm:flex-none justify-center bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg flex items-center gap-2 text-white font-semibold transition-all active:scale-95 text-sm shadow-lg shadow-emerald-500/20"
          >
            <FaSave /> Sync
          </button>
          <button
            onClick={exportExcel}
            className="flex-1 sm:flex-none justify-center bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg flex items-center gap-2 text-white font-semibold transition-all active:scale-95 text-sm"
          >
            <FaFileExport /> Excel
          </button>
          <label className="flex-1 sm:flex-none justify-center bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg flex items-center gap-2 text-white font-semibold cursor-pointer transition-all active:scale-95 text-sm">
            <FaFileImport /> Import
            <input type="file" accept=".xlsx" onChange={importExcel} className="hidden" />
          </label>
        </div>

        {/* TABLE - Updated to match Loans Page Style */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm text-gray-300">
            <thead>
              <tr className="bg-gray-800">
                <th className="border border-gray-700 px-2 py-2">No</th>
                <th className="border border-gray-700 px-2 py-2">Date</th>
                <th className="border border-gray-700 px-2 py-2">Due Date</th>
                <th className="border border-gray-700 px-2 py-2">Amount</th>
                <th className="border border-gray-700 px-2 py-2">Interest</th>
                <th className="border border-gray-700 px-2 py-2">Balance</th>
                <th className="border border-gray-700 px-2 py-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {savings.map((s, index) => (
                <tr key={s.id} className="bg-gray-900 hover:bg-gray-800">
                  <td className="border border-gray-700 px-2 py-2 text-center">{index + 1}</td>

                  {/* DATE */}
                  <td className="border border-gray-700 px-2 py-2">
                    <input
                      type="date"
                      value={s.date}
                      onChange={(e) => handleSavingChange(s.id!, "date", e.target.value)}
                      className="bg-gray-800 text-gray-200 px-2 py-1 rounded w-full"
                    />
                  </td>

                  {/* DUE DATE */}
                  <td className="border border-gray-700 px-2 py-2">
                    <input
                      type="date"
                      value={s.dueDate || ""}
                      onChange={(e) => handleSavingChange(s.id!, "dueDate", e.target.value)}
                      className="bg-gray-800 text-gray-200 px-2 py-1 rounded w-full"
                    />
                  </td>

                  {/* AMOUNT */}
                  <td className="border border-gray-700 px-2 py-2">
                    <input
                      type="number"
                      value={s.amount}
                      onChange={(e) => handleSavingChange(s.id!, "amount", e.target.value)}
                      className="bg-gray-800 text-gray-200 px-2 py-1 rounded w-full"
                    />
                  </td>

                  {/* INTEREST */}
                  <td className="border border-gray-700 px-2 py-2">
                    <input
                      type="number"
                      value={s.interest}
                      onChange={(e) => handleSavingChange(s.id!, "interest", e.target.value)}
                      className="bg-gray-800 text-gray-200 px-2 py-1 rounded w-full"
                    />
                  </td>

                  {/* BALANCE */}
                  <td className="border border-gray-700 px-2 py-2">
                    <input
                      type="number"
                      value={s.balance}
                      onChange={(e) => handleSavingChange(s.id!, "balance", e.target.value)}
                      className="bg-gray-800 text-gray-200 px-2 py-1 rounded w-full"
                    />
                  </td>

                  {/* DELETE ONLY in Actions column */}
                  <td className="border border-gray-700 px-2 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteSaving(s.id!)}
                        className="bg-red-600 px-2 py-1 rounded text-xs"
                      >
                        <FaTrash />
                      </button>
                    </div>
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

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
  const [members, setMembers] = useState<MemberData[]>(DEFAULT_MEMBERS);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(DEFAULT_MEMBERS[0]?.id || "");
  const [savings, setSavings] = useState<Saving[]>([]);

  const toNumber = (v: any) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));

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

  const exportExcel = () => {
    const dataToExport = savings.map((s) => ({
      MEMBER: members.find((m) => m.id === s.memberId)?.name || "",
      DATE: s.date,
      DUE_DATE: s.dueDate || "", // NEW FIELD
      AMOUNT: s.amount,
      INTEREST: s.interest,
      BALANCE: s.balance,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Savings");
    XLSX.writeFile(workbook, "savings.xlsx");
  };

  const importExcel = (e: any) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (evt: any) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const importedSavings: Saving[] = (data as any[]).map((row) =>
        recalc({
          id: crypto.randomUUID(),
          memberId: members.find((m) => m.name === row.MEMBER)?.id || selectedMemberId,
          date: row.DATE || "",
          dueDate: row.DUE_DATE || "", // NEW FIELD
          amount: toNumber(row.AMOUNT),
          interest: toNumber(row.INTEREST),
          balance: 0,
        })
      );

      setSavings(importedSavings);
    };

    reader.readAsBinaryString(file);
  };

  const totals = savings.reduce(
    (acc, s) => {
      acc.amount += toNumber(s.amount);
      acc.interest += toNumber(s.interest);
      acc.balance += toNumber(s.balance);
      return acc;
    },
    { amount: 0, interest: 0, balance: 0 }
  );

  const buttonClasses =
    "px-4 py-2 rounded flex items-center gap-2 text-white transform transition-transform duration-150 hover:scale-105 active:scale-95";

  return (
    <AdminLayout>
      <div className="p-5">

        {/* MEMBER SELECT */}
        <div className="flex gap-3 mb-4 items-center">
          <label className="text-gray-200">Member:</label>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="bg-gray-700 text-gray-200 px-3 py-2 rounded-md"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* BUTTONS */}
        <div className="flex gap-3 mb-4">
          <button onClick={addSavingRow} className={`bg-blue-600 ${buttonClasses}`}>
            <FaPlus /> Add Contribution
          </button>
          <button onClick={saveSavings} className={`bg-green-600 ${buttonClasses}`}>
            <FaSave /> Save
          </button>
          <label className={`bg-yellow-600 ${buttonClasses} cursor-pointer`}>
            <FaFileImport /> Import
            <input type="file" accept=".xlsx" onChange={importExcel} className="hidden" />
          </label>
          <button onClick={exportExcel} className={`bg-purple-600 ${buttonClasses}`}>
            <FaFileExport /> Export
          </button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 text-gray-200 rounded">
            <thead>
              <tr className="bg-gray-700">
                {[
                  "NO",
                  "DATE",
                  "DUE DATE", // NEW COLUMN
                  "CONTRIBUTION AMOUNT",
                  "INTEREST EARNED",
                  "BALANCE",
                  "ACTIONS",
                ].map((h, i) => (
                  <th key={i} className="px-3 py-2 border-b border-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {savings.map((s, index) => (
                <tr key={s.id} className="border-b border-gray-700">
                  <td className="px-3 py-2">{index + 1}</td>

                  {/* DATE */}
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={s.date}
                      onChange={(e) => handleSavingChange(s.id!, "date", e.target.value)}
                      className="bg-gray-700/50 px-2 py-1 w-full"
                    />
                  </td>

                  {/* DUE DATE */}
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={s.dueDate || ""}
                      onChange={(e) => handleSavingChange(s.id!, "dueDate", e.target.value)}
                      className="bg-gray-700/50 px-2 py-1 w-full"
                    />
                  </td>

                  {/* AMOUNT */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={s.amount}
                      onChange={(e) => handleSavingChange(s.id!, "amount", e.target.value)}
                      className="bg-gray-700/50 px-2 py-1 w-full"
                    />
                  </td>

                  {/* INTEREST */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={s.interest}
                      onChange={(e) => handleSavingChange(s.id!, "interest", e.target.value)}
                      className="bg-gray-700/50 px-2 py-1 w-full"
                    />
                  </td>

                  {/* BALANCE */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={s.balance}
                      onChange={(e) => handleSavingChange(s.id!, "balance", e.target.value)}
                      className="bg-gray-700/50 px-2 py-1 w-full"
                    />
                  </td>

                  {/* DELETE */}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => deleteSaving(s.id!)}
                      className="bg-red-600 px-3 py-2 rounded text-white flex items-center gap-1 transform transition-transform duration-150 hover:scale-105 active:scale-95"
                    >
                      <FaTrash /> Delete
                    </button>
                  </td>
                </tr>
              ))}

              {/* TOTALS */}
              <tr className="bg-gray-900 text-white font-bold">
                <td colSpan={3} className="px-3 py-2 border-b border-gray-600">
                  TOTAL
                </td>
                <td className="px-3 py-2 border-b border-gray-600 text-right">
                  {totals.amount}
                </td>
                <td className="px-3 py-2 border-b border-gray-600 text-right">
                  {totals.interest}
                </td>
                <td className="px-3 py-2 border-b border-gray-600 text-right">
                  {totals.balance}
                </td>
                <td className="px-3 py-2 border-b border-gray-600"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

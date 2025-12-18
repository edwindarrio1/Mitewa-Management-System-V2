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
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { FaPlus, FaTrash, FaSave, FaFileExport, FaFileImport } from "react-icons/fa";

interface MemberData {
  id: string;
  name: string;
}

interface Loan {
  id?: string;
  memberId: string;
  date: string;
  amount: number;
  interest: number; // editable
  paid: number;
  balance: number;
  deadline: string;
}

export default function LoansPage() {
  const [members, setMembers] = useState<MemberData[]>(DEFAULT_MEMBERS);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(DEFAULT_MEMBERS[0]?.id || "");
  const [loans, setLoans] = useState<Loan[]>([]);

  const toNumber = (v: any) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));

  // Recalculate loan values
  const recalc = (loan: Loan) => {
    const amount = toNumber(loan.amount);
    const paid = toNumber(loan.paid);

    // Fully paid → no penalty
    if (paid >= amount) {
      return { ...loan, interest: 0, balance: 0 };
    }

    const userInterest = toNumber(loan.interest);

    const todayStr = new Date().toISOString().slice(0, 10);
    const overdue = loan.deadline && loan.deadline < todayStr;

    // Auto 1% interest if overdue, else use user-entered interest
    const interest = overdue ? amount * 0.01 : userInterest;

    const balance = amount + interest - paid;

    return { ...loan, interest, balance };
  };

  // Load loans for selected member
  const loadLoans = async () => {
    if (!selectedMemberId) return;
    const q = query(collection(db, "loans"), where("memberId", "==", selectedMemberId));
    const querySnapshot = await getDocs(q);
    const data: Loan[] = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...(doc.data() as Loan) });
    });
    setLoans(data.map(recalc));
  };

  useEffect(() => {
    loadLoans();
  }, [selectedMemberId]);

  const handleLoanChange = (id: string, field: keyof Loan, value: any) => {
    setLoans((prev) =>
      prev.map((loan) => {
        if (loan.id !== id) return loan;
        const updated = {
          ...loan,
          [field]:
            field === "date" || field === "deadline" ? value : toNumber(value),
        };
        return recalc(updated);
      })
    );
  };

  const addLoanRow = () => {
    if (!selectedMemberId) return;
    setLoans((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        memberId: selectedMemberId,
        date: "",
        amount: 0,
        interest: 0,
        paid: 0,
        balance: 0,
        deadline: "",
      },
    ]);
  };

  const saveLoans = async () => {
    for (const loan of loans) {
      if (loan.id) {
        await setDoc(doc(db, "loans", loan.id), loan);
      } else {
        await addDoc(collection(db, "loans"), loan);
      }
    }
    alert("Saved!");
  };

  const deleteLoan = async (id: string) => {
    await deleteDoc(doc(db, "loans", id));
    setLoans((prev) => prev.filter((l) => l.id !== id));
  };

  const exportExcel = () => {
    const dataToExport = loans.map((loan) => ({
      MEMBER: members.find((m) => m.id === loan.memberId)?.name || "",
      DATE: loan.date,
      AMOUNT: loan.amount,
      INTEREST: loan.interest,
      PAID: loan.paid,
      BALANCE: loan.balance,
      DEADLINE: loan.deadline,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Loans");
    XLSX.writeFile(workbook, "loans.xlsx");
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

      const importedLoans: Loan[] = (data as any[]).map((row) =>
        recalc({
          id: crypto.randomUUID(),
          memberId: members.find((m) => m.name === row.MEMBER)?.id || selectedMemberId,
          date: row.DATE || "",
          amount: toNumber(row.AMOUNT),
          interest: toNumber(row.INTEREST),
          paid: toNumber(row.PAID),
          balance: 0,
          deadline: row.DEADLINE || "",
        })
      );

      setLoans(importedLoans);
    };

    reader.readAsBinaryString(file);
  };

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
          <button onClick={addLoanRow} className={`bg-blue-600 ${buttonClasses}`}>
            <FaPlus /> Add Loan
          </button>
          <button onClick={saveLoans} className={`bg-green-600 ${buttonClasses}`}>
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
                {["NO", "DATE", "AMOUNT", "INTEREST", "PAID", "BALANCE", "DEADLINE", "ACTIONS"].map(
                  (h, i) => (
                    <th key={i} className="px-3 py-2 border-b border-gray-600">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loans.map((loan, index) => (
                <tr key={loan.id} className="border-b border-gray-700">
                  <td className="px-3 py-2">{index + 1}</td>

                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={loan.date}
                      onChange={(e) =>
                        handleLoanChange(loan.id!, "date", e.target.value)
                      }
                      className="bg-gray-700/50 px-2 py-1 w-full"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={loan.amount}
                      onChange={(e) =>
                        handleLoanChange(loan.id!, "amount", e.target.value)
                      }
                      className="bg-gray-700/50 px-2 py-1 w-full"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={loan.interest}
                      onChange={(e) =>
                        handleLoanChange(loan.id!, "interest", e.target.value)
                      }
                      className="bg-gray-700/50 px-2 py-1 w-full"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={loan.paid}
                      onChange={(e) =>
                        handleLoanChange(loan.id!, "paid", e.target.value)
                      }
                      className="bg-gray-700/50 px-2 py-1 w-full"
                    />
                  </td>

                  <td className="px-3 py-2 text-red-400">
                    {loan.balance.toFixed(2)}
                  </td>

                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={loan.deadline}
                      onChange={(e) =>
                        handleLoanChange(loan.id!, "deadline", e.target.value)
                      }
                      className="bg-gray-700/50 px-2 py-1 w-full"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <button
                      onClick={() => deleteLoan(loan.id!)}
                      className="bg-red-600 px-3 py-2 rounded text-white flex items-center gap-1 transform transition-transform duration-150 hover:scale-105 active:scale-95"
                    >
                      <FaTrash /> Delete
                    </button>
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

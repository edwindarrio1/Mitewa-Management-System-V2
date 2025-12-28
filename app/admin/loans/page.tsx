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
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { FaPlus, FaTrash, FaSave, FaFileExport, FaFileImport, FaCheck, FaTimes } from "react-icons/fa";

interface MemberData {
  id: string;
  name: string;
}

interface Loan {
  id?: string;
  memberId: string;
  date: string;
  amount: number;
  interest: number;
  paid: number;
  balance: number;
  deadline: string;
}

interface LoanRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  purpose: string;
  duration: number;
  status: string;
  createdAt: any;
}

export default function LoansPage() {
  const [activeTab, setActiveTab] = useState<"loans" | "requests">("loans");
  const [members, setMembers] = useState<MemberData[]>([]); // Initialize empty
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);

  const toNumber = (value: any) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/[^0-9.-]/g, "");
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  // Load Loan Requests
  const loadLoanRequests = async () => {
    const q = query(collection(db, "loanRequests"));
    const snapshot = await getDocs(q);
    const requests: LoanRequest[] = [];
    snapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() } as LoanRequest);
    });
    setLoanRequests(requests);
  };

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
    loadLoanRequests();
  }, []);

  // Approve Loan Request
  const approveLoanRequest = async (req: LoanRequest) => {
    try {
      // Create new loan record
      await addDoc(collection(db, "loans"), {
        memberId: req.userId,
        amount: req.amount,
        interest: 0,
        paid: 0,
        balance: req.amount,
        date: new Date().toISOString().slice(0, 10),
        deadline: new Date(Date.now() + req.duration * 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        createdAt: serverTimestamp(),
      });

      // Update request status
      await updateDoc(doc(db, "loanRequests", req.id), {
        status: "approved",
        approvedAt: serverTimestamp(),
      });

      loadLoanRequests();
      alert("Loan request approved!");
    } catch (error) {
      console.error("Error approving loan:", error);
      alert("Failed to approve loan request");
    }
  };

  // Reject Loan Request
  const rejectLoanRequest = async (req: LoanRequest) => {
    try {
      await updateDoc(doc(db, "loanRequests", req.id), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
      });

      loadLoanRequests();
      alert("Loan request rejected");
    } catch (error) {
      console.error("Error rejecting loan:", error);
      alert("Failed to reject loan request");
    }
  };

  // Recalculate loan values
  const recalc = (loan: Loan) => {
    const amount = toNumber(loan.amount);
    const paid = toNumber(loan.paid);

    if (paid >= amount) {
      return { ...loan, interest: 0, balance: 0 };
    }

    const userInterest = toNumber(loan.interest);
    const todayStr = new Date().toISOString().slice(0, 10);
    const overdue = loan.deadline && loan.deadline < todayStr;
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
        date: new Date().toISOString().slice(0, 10),
        amount: 0,
        interest: 0,
        paid: 0,
        balance: 0,
        deadline: "",
      },
    ]);
  };

  const saveLoan = async (loan: Loan) => {
    try {
      if (loan.id && !loan.id.includes("-")) {
        await setDoc(doc(db, "loans", loan.id), {
          memberId: loan.memberId,
          date: loan.date,
          amount: loan.amount,
          interest: loan.interest,
          paid: loan.paid,
          balance: loan.balance,
          deadline: loan.deadline,
        });
      } else {
        await addDoc(collection(db, "loans"), {
          memberId: loan.memberId,
          date: loan.date,
          amount: loan.amount,
          interest: loan.interest,
          paid: loan.paid,
          balance: loan.balance,
          deadline: loan.deadline,
        });
      }
      loadLoans();
    } catch (error) {
      console.error("Error saving loan:", error);
    }
  };

  // Helper to save all loans
  const saveAllLoans = async () => {
    for (const loan of loans) {
      await saveLoan(loan);
    }
    alert("All loans saved successfully!");
  };

  const deleteLoan = async (loan: Loan) => {
    if (loan.id && !loan.id.includes("-")) {
      await deleteDoc(doc(db, "loans", loan.id));
    }
    setLoans((prev) => prev.filter((l) => l.id !== loan.id));
  };

  const exportToExcel = () => {
    const memberName = members.find((m) => m.id === selectedMemberId)?.name || "Unknown";
    const safeName = memberName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    const data = loans.map((loan) => ({
      MEMBER: memberName,
      DATE: loan.date,
      AMOUNT: loan.amount,
      INTEREST: loan.interest,
      PAID: loan.paid,
      BALANCE: loan.balance,
      DEADLINE: loan.deadline,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loans");
    XLSX.writeFile(wb, `${safeName}_loans.xlsx`);
  };

  const importFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet);

      const importedLoans: Loan[] = json
        .filter((row) => row["MEMBER"] || row["member"] || row["Member"] || row["NAME"] || row["name"])
        .map((row) =>
          recalc({
            id: crypto.randomUUID(),
            memberId: members.find((m) =>
              m.name.toLowerCase() === String(row.MEMBER || row.member || row.Member || row.NAME || row.name || "").toLowerCase()
            )?.id || selectedMemberId,
            date: row.DATE || row.date || row.Date || "",
            amount: toNumber(row.AMOUNT || row.amount || row.Amount),
            interest: toNumber(row.INTEREST || row.interest || row.Interest),
            paid: toNumber(row.PAID || row.paid || row.Paid),
            balance: 0,
            deadline: row.DEADLINE || row.deadline || row.Deadline || row["DUE DATE"] || "",
          })
        );

      if (importedLoans.length === 0) {
        alert("No valid data found in the Excel file.");
        return;
      }

      setLoans(importedLoans);
      alert(`Imported ${importedLoans.length} records. Click 'Save' to persist.`);
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
      <div className="p-5">
        {/* TABS */}
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab("loans")}
            className={`px-6 py-3 font-semibold transition-colors ${activeTab === "loans"
              ? "text-emerald-400 border-b-2 border-emerald-400"
              : "text-gray-400 hover:text-gray-200"
              }`}
          >
            Active Loans
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-6 py-3 font-semibold transition-colors ${activeTab === "requests"
              ? "text-emerald-400 border-b-2 border-emerald-400"
              : "text-gray-400 hover:text-gray-200"
              }`}
          >
            Loan Requests
          </button>
        </div>

        {/* ACTIVE LOANS TAB */}
        {activeTab === "loans" && (
          <>
            {/* Member Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <label className="text-gray-300 font-medium shrink-0">Select Member:</label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="bg-gray-700 text-gray-200 px-4 py-2 rounded-lg w-full sm:w-72 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
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
                onClick={addLoanRow}
                className="flex-1 sm:flex-none justify-center bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 text-white font-semibold transition-all active:scale-95 text-sm"
              >
                <FaPlus /> Add Loan
              </button>
              <button
                onClick={saveAllLoans}
                className="flex-1 sm:flex-none justify-center bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg flex items-center gap-2 text-white font-semibold transition-all active:scale-95 text-sm shadow-lg shadow-emerald-500/20"
              >
                <FaSave /> Sync
              </button>
              <button
                onClick={exportToExcel}
                className="flex-1 sm:flex-none justify-center bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg flex items-center gap-2 text-white font-semibold transition-all active:scale-95 text-sm"
              >
                <FaFileExport /> Excel
              </button>
              <label className="flex-1 sm:flex-none justify-center bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg flex items-center gap-2 text-white font-semibold cursor-pointer transition-all active:scale-95 text-sm">
                <FaFileImport /> Import
                <input type="file" accept=".xlsx,.xls" onChange={importFromExcel} className="hidden" />
              </label>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm text-gray-300">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="border border-gray-700 px-2 py-2">Date</th>
                    <th className="border border-gray-700 px-2 py-2">Amount</th>
                    <th className="border border-gray-700 px-2 py-2">Interest</th>
                    <th className="border border-gray-700 px-2 py-2">Paid</th>
                    <th className="border border-gray-700 px-2 py-2">Balance</th>
                    <th className="border border-gray-700 px-2 py-2">Deadline</th>
                    <th className="border border-gray-700 px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.id} className="bg-gray-900 hover:bg-gray-800">
                      <td className="border border-gray-700 px-2 py-2">
                        <input
                          type="date"
                          value={loan.date}
                          onChange={(e) => handleLoanChange(loan.id!, "date", e.target.value)}
                          className="bg-gray-800 text-gray-200 px-2 py-1 rounded w-full"
                        />
                      </td>
                      <td className="border border-gray-700 px-2 py-2">
                        <input
                          type="number"
                          value={loan.amount}
                          onChange={(e) => handleLoanChange(loan.id!, "amount", e.target.value)}
                          className="bg-gray-800 text-gray-200 px-2 py-1 rounded w-full"
                        />
                      </td>
                      <td className="border border-gray-700 px-2 py-2">
                        <input
                          type="number"
                          value={loan.interest}
                          onChange={(e) => handleLoanChange(loan.id!, "interest", e.target.value)}
                          className="bg-gray-800 text-gray-200 px-2 py-1 rounded w-full"
                        />
                      </td>
                      <td className="border border-gray-700 px-2 py-2">
                        <input
                          type="number"
                          value={loan.paid}
                          onChange={(e) => handleLoanChange(loan.id!, "paid", e.target.value)}
                          className="bg-gray-800 text-gray-200 px-2 py-1 rounded w-full"
                        />
                      </td>
                      <td className="border border-gray-700 px-2 py-2 font-bold">{loan.balance.toFixed(2)}</td>
                      <td className="border border-gray-700 px-2 py-2">
                        <input
                          type="date"
                          value={loan.deadline}
                          onChange={(e) => handleLoanChange(loan.id!, "deadline", e.target.value)}
                          className="bg-gray-800 text-gray-200 px-2 py-1 rounded w-full"
                        />
                      </td>
                      <td className="border border-gray-700 px-2 py-2">
                        <div className="flex gap-2">
                          {/* REMOVED SAVE BUTTON FROM HERE */}
                          <button onClick={() => deleteLoan(loan)} className="bg-red-600 px-2 py-1 rounded text-xs">
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* LOAN REQUESTS TAB */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {loanRequests.filter(r => r.status === "pending").length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p className="text-xl">No pending loan requests</p>
              </div>
            ) : (
              loanRequests
                .filter((r) => r.status === "pending")
                .map((req) => (
                  <div key={req.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-gray-400 text-sm">User</p>
                        <p className="text-white font-semibold">{req.userEmail}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Amount</p>
                        <p className="text-emerald-400 font-bold text-lg">KES {req.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Duration</p>
                        <p className="text-white font-semibold">{req.duration} months</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Date</p>
                        <p className="text-white font-semibold">
                          {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-gray-400 text-sm mb-1">Purpose</p>
                      <p className="text-white">{req.purpose}</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => approveLoanRequest(req)}
                        className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg flex items-center gap-2 text-white font-semibold transition-colors"
                      >
                        <FaCheck /> Approve
                      </button>
                      <button
                        onClick={() => rejectLoanRequest(req)}
                        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center gap-2 text-white font-semibold transition-colors"
                      >
                        <FaTimes /> Reject
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

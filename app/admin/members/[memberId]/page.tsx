"use client";

import { useState, useEffect, useRef } from "react";
import AdminLayout from "../../Admin-Layout";
import * as XLSX from "xlsx";

interface Loan {
  id: string;
  date: string;
  amount: number;
  interest: number;
  paid: number;
  balance: number;
}

interface Saving {
  id: string;
  month: string;
  shares: number;
  amount: number;
  dividend: number;
  arrears: number;
}

interface Member {
  id: string;
  name: string;
  loans: Loan[];
  savings: Saving[];
}

export default function MemberDetailPage() {
  const [activeTab, setActiveTab] = useState<"loans" | "savings">("loans");
  const [member, setMember] = useState<Member | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Mock member data
  useEffect(() => {
    const mockMember: Member = {
      id: "1",
      name: "MR. NDUNGU P. K",
      loans: [
        { id: "l1", date: "2025-11-01", amount: 5000, interest: 0, paid: 5000, balance: 0 },
        { id: "l2", date: "2025-10-20", amount: 300000, interest: 3000, paid: 0, balance: 303000 },
      ],
      savings: [
        { id: "s1", month: "Jan", shares: 50, amount: 60000, dividend: 4500, arrears: 0 },
        { id: "s2", month: "Feb", shares: 50, amount: 60000, dividend: 4500, arrears: 0 },
      ],
    };
    setMember(mockMember);
  }, []);

  if (!member) return <AdminLayout>Loading...</AdminLayout>;

  // Format date to dd/mm/yyyy
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Editable handlers
  const handleLoanChange = (id: string, field: keyof Loan, value: string | number) => {
    setMember((prev) => {
      if (!prev) return prev;
      const updatedLoans = prev.loans.map((loan) => {
        if (loan.id === id) {
          const updatedLoan = { ...loan, [field]: field === "date" ? value : Number(value) };
          updatedLoan.balance = updatedLoan.amount + updatedLoan.interest - updatedLoan.paid;
          return updatedLoan;
        }
        return loan;
      });
      return { ...prev, loans: updatedLoans };
    });
  };

  const handleSavingChange = (id: string, field: keyof Saving, value: string | number) => {
    setMember((prev) => {
      if (!prev) return prev;
      const updatedSavings = prev.savings.map((save) => {
        if (save.id === id) {
          return { ...save, [field]: field === "month" ? value : Number(value) };
        }
        return save;
      });
      return { ...prev, savings: updatedSavings };
    });
  };

  // Print function
  const printTable = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const printWindow = window.open("", "", "width=900,height=700");
    printWindow?.document.write(`
      <html>
        <head>
          <title>${member.name} - ${activeTab.toUpperCase()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
            h1 { color: #059669; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #374151; padding: 8px; text-align: left; }
            th { background-color: #10b981; color: #fff; }
            tr:nth-child(even) { background-color: #e5e7eb; }
          </style>
        </head>
        <body>
          <h1>${member.name} - ${activeTab.toUpperCase()}</h1>
          ${printContents}
        </body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.focus();
    printWindow?.print();
  };

  // Export Excel
  const exportToExcel = () => {
    if (!member) return;
    const wsData =
      activeTab === "loans"
        ? member.loans.map(({ id, ...rest }) => rest)
        : member.savings.map(({ id, ...rest }) => rest);
    const ws = XLSX.utils.json_to_sheet(wsData);
    ws["!cols"] = wsData[0] ? Object.keys(wsData[0]).map(() => ({ wch: 15 })) : [];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab.toUpperCase());
    XLSX.writeFile(wb, `${member.name}-${activeTab}.xlsx`);
  };

  // Import Excel
  const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet);

      if (activeTab === "loans") {
        setMember((prev) =>
          prev
            ? {
                ...prev,
                loans: jsonData.map((d, i) => ({
                  id: `l${i}`,
                  date: d.date || "2025-11-01",
                  amount: Number(d.amount || 0),
                  interest: Number(d.interest || 0),
                  paid: Number(d.paid || 0),
                  balance: Number(d.amount || 0) + Number(d.interest || 0) - Number(d.paid || 0),
                })),
              }
            : prev
        );
      } else {
        setMember((prev) =>
          prev
            ? {
                ...prev,
                savings: jsonData.map((d, i) => ({
                  id: `s${i}`,
                  month: d.month || "",
                  shares: Number(d.shares || 0),
                  amount: Number(d.amount || 0),
                  dividend: Number(d.dividend || 0),
                  arrears: Number(d.arrears || 0),
                })),
              }
            : prev
        );
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold text-emerald-400 mb-4">Member: {member.name}</h2>

      {/* Tabs */}
      <div className="flex gap-4 mb-4">
        {["loans", "savings"].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded-lg font-semibold ${
              activeTab === tab ? "bg-emerald-400 text-gray-900" : "bg-gray-700/50 text-gray-300 hover:bg-gray-700/70"
            }`}
            onClick={() => setActiveTab(tab as any)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <button onClick={exportToExcel} className="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-lg text-white font-semibold">
          Export Excel
        </button>
        <label className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-lg text-white font-semibold cursor-pointer">
          Import Excel
          <input type="file" accept=".xlsx, .xls" onChange={importFromExcel} className="hidden" />
        </label>
        <button onClick={printTable} className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg text-white font-semibold">
          Print
        </button>
      </div>

      <div ref={printRef} className="overflow-x-auto">
        {/* LOANS TABLE */}
        {activeTab === "loans" && (
          <table className="min-w-full text-left border border-gray-700 rounded-xl">
            <thead className="bg-gray-800/70 text-gray-300">
              <tr>
                <th className="px-6 py-3 border-b border-gray-700">Date</th>
                <th className="px-6 py-3 border-b border-gray-700">Amount</th>
                <th className="px-6 py-3 border-b border-gray-700">Interest</th>
                <th className="px-6 py-3 border-b border-gray-700">Paid</th>
                <th className="px-6 py-3 border-b border-gray-700">Balance</th>
              </tr>
            </thead>
            <tbody>
              {member.loans.map((loan) => (
                <tr key={loan.id} className="hover:bg-gray-700/50 transition-colors duration-200">
                  <td className="px-6 py-3 border-b border-gray-700">
                    <input
                      type="text"
                      value={formatDate(loan.date)}
                      onChange={(e) => handleLoanChange(loan.id, "date", e.target.value)}
                      className="bg-gray-700/50 text-gray-200 px-2 py-1 rounded-md w-full"
                    />
                  </td>
                  <td className="px-6 py-3 border-b border-gray-700">
                    <input type="number" value={loan.amount} onChange={(e) => handleLoanChange(loan.id, "amount", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 rounded-md w-full" />
                  </td>
                  <td className="px-6 py-3 border-b border-gray-700">
                    <input type="number" value={loan.interest} onChange={(e) => handleLoanChange(loan.id, "interest", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 rounded-md w-full" />
                  </td>
                  <td className="px-6 py-3 border-b border-gray-700">
                    <input type="number" value={loan.paid} onChange={(e) => handleLoanChange(loan.id, "paid", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 rounded-md w-full" />
                  </td>
                  <td className="px-6 py-3 border-b border-gray-700">{loan.balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* SAVINGS TABLE */}
        {activeTab === "savings" && (
          <table className="min-w-full text-left border border-gray-700 rounded-xl">
            <thead className="bg-gray-800/70 text-gray-300">
              <tr>
                <th className="px-6 py-3 border-b border-gray-700">Month</th>
                <th className="px-6 py-3 border-b border-gray-700">Shares</th>
                <th className="px-6 py-3 border-b border-gray-700">Amount</th>
                <th className="px-6 py-3 border-b border-gray-700">Dividend</th>
                <th className="px-6 py-3 border-b border-gray-700">Arrears</th>
              </tr>
            </thead>
            <tbody>
              {member.savings.map((save) => (
                <tr key={save.id} className="hover:bg-gray-700/50 transition-colors duration-200">
                  <td className="px-6 py-3 border-b border-gray-700">
                    <input type="text" value={save.month} onChange={(e) => handleSavingChange(save.id, "month", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 rounded-md w-full" />
                  </td>
                  <td className="px-6 py-3 border-b border-gray-700">
                    <input type="number" value={save.shares} onChange={(e) => handleSavingChange(save.id, "shares", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 rounded-md w-full" />
                  </td>
                  <td className="px-6 py-3 border-b border-gray-700">
                    <input type="number" value={save.amount} onChange={(e) => handleSavingChange(save.id, "amount", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 rounded-md w-full" />
                  </td>
                  <td className="px-6 py-3 border-b border-gray-700">
                    <input type="number" value={save.dividend} onChange={(e) => handleSavingChange(save.id, "dividend", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 rounded-md w-full" />
                  </td>
                  <td className="px-6 py-3 border-b border-gray-700">
                    <input type="number" value={save.arrears} onChange={(e) => handleSavingChange(save.id, "arrears", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 rounded-md w-full" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}

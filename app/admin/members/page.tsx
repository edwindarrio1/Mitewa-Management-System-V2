"use client";

import { useState, useRef, useEffect } from "react";
import AdminLayout from "../Admin-Layout";
import * as XLSX from "xlsx";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  doc,
  query,
  where,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { Plus, Save, FileText, Upload, Trash2, Download } from "lucide-react"; // Added Download icon

interface MemberData {
  id?: string;
  no: number;
  name: string;
  noOfShares: number;
  amountOfShares: number;
  dividend: number;
  hon?: number;
  investmentArrears?: number;
  riskFundArrears?: number;
  arrearsOnShares?: number;
  arrearsOnLoans?: number;
  prevYearArrearsBalance?: number;
  absenteeism?: number;
  arrearsOnWelfare?: number;
  lessAdvanced?: number;
  netPayAmount?: number;
  period: string;
}


export default function MembersPage() {
  const [members, setMembers] = useState<MemberData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("2023/2024");
  const [tableTitle, setTableTitle] = useState("Members Table");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof MemberData | "">("");
  const [allPeriods, setAllPeriods] = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const toNumber = (value: any) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      // Remove commas and other non-numeric characters except decimal point and sign
      const cleaned = value.replace(/[^0-9.-]/g, "");
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  // Load financial years
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const snapshot = await getDocs(collection(db, "financialYears"));
        const years = snapshot.docs.map((doc) => doc.id);
        setAllPeriods(years.length ? years : ["2023/2024"]);
      } catch (err) {
        console.error("Error loading periods:", err);
        setAllPeriods(["2023/2024"]);
      }
    };
    fetchPeriods();
  }, []);

  // Load members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const q = query(collection(db, "members"), where("period", "==", selectedPeriod));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setMembers([]);
        } else {
          const fetched = snapshot.docs.map((doc) => ({ ...(doc.data() as MemberData), id: doc.id }));
          setMembers(fetched);
        }
      } catch (err) {
        console.error("Error loading members:", err);
        setMembers([]);
      }
    };
    fetchMembers();
  }, [selectedPeriod]);

  const handleChange = (id: string, field: keyof MemberData, value: string | number) => {
    setMembers((prev) =>
      prev.map((m) =>
        (m.id === id)
          ? { ...m, [field]: typeof value === "string" ? (field === "name" ? value : toNumber(value)) : value }
          : m
      )
    );
  };

  const addNewMember = () => {
    const currentPeriodMembers = members.filter((m) => m.period === selectedPeriod);
    const maxNo = currentPeriodMembers.reduce((max, m) => Math.max(max, m.no), 0);

    const newMember: MemberData = {
      id: crypto.randomUUID(),
      no: maxNo + 1,
      name: "",
      noOfShares: 0,
      amountOfShares: 0,
      dividend: 0,
      hon: 0,
      investmentArrears: 0,
      riskFundArrears: 0,
      arrearsOnShares: 0,
      arrearsOnLoans: 0,
      prevYearArrearsBalance: 0,
      absenteeism: 0,
      arrearsOnWelfare: 0,
      lessAdvanced: 0,
      netPayAmount: 0,
      period: selectedPeriod,
    };
    setMembers((prev) => [...prev, newMember]);
  };

  const deleteMember = (id?: string) => {
    if (id && !id.startsWith("default-") && !id.includes("-")) {
      deleteDoc(doc(db, "members", id)).catch((err) => console.error("Delete failed", err));
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const deleteAllMembers = async () => {
    if (filteredMembers.length === 0) return;
    if (!confirm(`⚠️ CRITICAL ACTION: Are you sure you want to delete ALL ${filteredMembers.length} members shown for the period "${selectedPeriod}"? This action permanently removes them from the database and cannot be undone.`)) return;

    try {
      const batch = writeBatch(db);
      let count = 0;
      for (const member of filteredMembers) {
        if (member.id && !member.id.startsWith("default-")) {
          batch.delete(doc(db, "members", member.id));
          count++;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      setMembers(prev => prev.filter(m => !filteredMembers.some(fm => fm.id === m.id)));
      alert(`Successfully deleted ${count} members from the database.`);
    } catch (err) {
      console.error("Error deleting all members:", err);
      alert("Failed to delete all members. Please check your connection.");
    }
  };

  const importFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      // Use header: 1 to get an array of arrays (much more reliable for messy files)
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      if (rows.length < 1) {
        alert("The Excel file seems to be empty.");
        return;
      }

      // 1. Find the header row (the one that contains "NAME" or similar)
      const standardize = (s: any) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        if (rows[i].some(cell => ["name", "membername", "member"].includes(standardize(cell)))) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        alert("Could not find a header row with 'NAME' column. Please check your Excel format.");
        return;
      }

      const headers = rows[headerRowIndex].map(h => standardize(h));
      const dataRows = rows.slice(headerRowIndex + 1);

      const mappedData: MemberData[] = dataRows
        .map((row, i) => {
          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
              const stdPk = standardize(pk);
              const colIndex = headers.indexOf(stdPk);
              if (colIndex !== -1 && row[colIndex] !== undefined && row[colIndex] !== null) {
                return row[colIndex];
              }
            }
            return 0;
          };

          const name = String(getVal(["NAME", "Member Name", "Member"]) || "").trim();
          if (!name || name.toUpperCase() === "TOTAL" || name.toUpperCase() === "SUBTOTAL") return null;

          const rowNo = toNumber(getVal(["NO", "no.", "no"]));
          const finalNo = rowNo > 0 ? rowNo : (members.length + i + 1);

          return {
            id: crypto.randomUUID(),
            no: finalNo,
            name: name,
            noOfShares: toNumber(getVal(["NO OF SHARES", "No. of Shares", "Shares Count", "noOfShares", "No. Shares"])),
            amountOfShares: toNumber(getVal(["AMOUNT OF SHARES", "Amount Shares", "Amount of Shares", "amountOfShares", "Shares Amount"])),
            dividend: toNumber(getVal(["DIVIDEND", "Dividends", "dividend", "dividends", "Div"])),
            hon: toNumber(getVal(["HON", "hon", "Hon"])),
            investmentArrears: toNumber(getVal(["INVESTMENT ARREARS", "Investment Arrears", "invest arrears", "investmentArrears", "Arrears Investment"])),
            riskFundArrears: toNumber(getVal(["RISK FUND ARREARS", "Risk Fund Arrears", "risk arrears", "riskFundArrears", "Arrears Risk Fund"])),
            arrearsOnShares: toNumber(getVal(["ARREARS ON SHARES", "Arrears on Shares", "arrears on share", "arrearsOnShares", "Share Arrears"])),
            arrearsOnLoans: toNumber(getVal(["ARREARS ON LOANS", "Arrears on loans", "loan arrears", "arrearsOnLoans", "Loan Arrears"])),
            prevYearArrearsBalance: toNumber(getVal(["PREVIOUS YEAR ARREARS BALANCE", "Prev Year Arrears Balance", "PREV ARREARS", "prevYearArrearsBalance", "PREV. YEAR BALANCE", "Previous Year balance", "prev year balance"])),
            absenteeism: toNumber(getVal(["ABSENTEEISM", "Absenteeism", "absent", "absenteeism", "Absence"])),
            arrearsOnWelfare: toNumber(getVal([
              "ARREARS ON WELFARE",
              "Arrears On Welfare",
              "Arrears on Welfare",
              "Welfare Arrears",
              "arrearsOnWelfare",
              "WELFARE",
              "WELFARE ARREARS",
              "ARREARS WELFARE",
              "WELFARE BAL",
              "Arrears On Welfare Balance"
            ])),
            lessAdvanced: toNumber(getVal(["LESS ADVANCED", "Less Advanced", "lessAdvanced", "Advanced"])),
            netPayAmount: toNumber(getVal(["NET PAY AMOUNT", "Net Pay Amount", "Net Pay", "netPayAmount"])),
            period: selectedPeriod,
          };
        })
        .filter((m): m is MemberData => m !== null);

      if (mappedData.length === 0) {
        alert("No valid member data found after the header row.");
        return;
      }

      setMembers((prev) => [...prev, ...mappedData]);
      alert(`Successfully imported ${mappedData.length} members. Don't forget to click 'Save Changes' to persist to the database.`);
    } catch (err) {
      console.error("Import failed:", err);
      alert("Failed to import Excel file. Please ensure it's a valid .xlsx or .xls file.");
    } finally {
      e.target.value = "";
    }
  };

  const saveChanges = async () => {
    try {
      for (const member of members) {
        if (member.id) {
          // ✅ FIXED LINE — replaced updateDoc()
          await setDoc(doc(db, "members", member.id), member, { merge: true });
        } else {
          await addDoc(collection(db, "members"), member);
        }
      }
      alert("Changes saved successfully!");
    } catch (err) {
      console.error("Error saving:", err);
      alert("Failed to save changes");
    }
  };

  const addNewFinancialYear = async () => {
    const newPeriod = prompt("Enter new financial year (e.g., 2024/2025):");
    if (!newPeriod) return;

    // Start with an empty list for the new financial year
    setMembers([]);
    setSelectedPeriod(newPeriod);

    try {
      await setDoc(doc(db, "financialYears", newPeriod), { createdAt: new Date() });
      setAllPeriods((prev) => [...prev, newPeriod]);
    } catch (err) {
      console.error("Error creating new financial year:", err);
    }
  };

  // 🆕 START: EXPORT TO EXCEL FUNCTION
  const exportToExcel = () => {
    const dataToExport = filteredMembers.map(m => ({
      "No.": m.no,
      "Name": m.name,
      "No. of Shares": m.noOfShares,
      "Amount Shares": m.amountOfShares,
      "Dividend": m.dividend,
      "HON": m.hon || 0,
      "Investment Arrears": m.investmentArrears || 0,
      "Risk Fund Arrears": m.riskFundArrears || 0,
      "Arrears on Shares": m.arrearsOnShares || 0,
      "Arrears on loans": m.arrearsOnLoans || 0,
      "Previous Year Arrears Balance": m.prevYearArrearsBalance || 0,
      "Absenteeism": m.absenteeism || 0,
      "Arrears On Welfare": m.arrearsOnWelfare || 0,
      "Less Advanced": m.lessAdvanced || 0,
      "Net Pay Amount": m.netPayAmount || 0,
      "PERIOD": m.period,
    }));

    const totalRow = {
      "No.": "TOTAL",
      "Name": "",
      "No. of Shares": totals.noOfShares,
      "Amount Shares": totals.amountOfShares,
      "Dividend": totals.dividend,
      "HON": totals.hon,
      "Investment Arrears": totals.investmentArrears,
      "Risk Fund Arrears": totals.riskFundArrears,
      "Arrears on Shares": totals.arrearsOnShares,
      "Arrears on loans": totals.arrearsOnLoans,
      "Previous Year Arrears Balance": totals.prevYearArrearsBalance,
      "Absenteeism": totals.absenteeism,
      "Arrears On Welfare": totals.arrearsOnWelfare,
      "Less Advanced": totals.lessAdvanced,
      "Net Pay Amount": totals.netPayAmount,
      "PERIOD": selectedPeriod,
    };

    const dataWithTotals = [...dataToExport, totalRow];

    const ws = XLSX.utils.json_to_sheet(dataWithTotals);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tableTitle || "Members Data");
    XLSX.writeFile(wb, `${tableTitle.replace(/\s/g, '_')}_${selectedPeriod}.xlsx`);
  };
  // 🆕 END: EXPORT TO EXCEL FUNCTION

  let filteredMembers = members
    .filter((m) => m.period === selectedPeriod)
    .filter((m) => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  filteredMembers.sort((a, b) => a.no - b.no);

  if (sortField && sortField !== "no") {
    filteredMembers.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "number" && typeof bVal === "number") return aVal - bVal;
      if (typeof aVal === "string" && typeof bVal === "string") return aVal.localeCompare(bVal);
      return 0;
    });
  }

  const totals = filteredMembers.reduce((acc, m) => {
    acc.noOfShares += toNumber(m.noOfShares);
    acc.amountOfShares += toNumber(m.amountOfShares);
    acc.dividend += toNumber(m.dividend);
    acc.hon += toNumber(m.hon);
    acc.investmentArrears += toNumber(m.investmentArrears);
    acc.riskFundArrears += toNumber(m.riskFundArrears);
    acc.arrearsOnShares += toNumber(m.arrearsOnShares);
    acc.arrearsOnLoans += toNumber(m.arrearsOnLoans);
    acc.prevYearArrearsBalance += toNumber(m.prevYearArrearsBalance);
    acc.absenteeism += toNumber(m.absenteeism);
    acc.arrearsOnWelfare += toNumber(m.arrearsOnWelfare);
    acc.lessAdvanced += toNumber(m.lessAdvanced);
    acc.netPayAmount += toNumber(m.netPayAmount);
    return acc;
  }, {
    noOfShares: 0, amountOfShares: 0, dividend: 0, hon: 0, investmentArrears: 0,
    riskFundArrears: 0, arrearsOnShares: 0, arrearsOnLoans: 0,
    prevYearArrearsBalance: 0, absenteeism: 0, arrearsOnWelfare: 0,
    lessAdvanced: 0, netPayAmount: 0
  });

  return (
    <AdminLayout>
      <div className="mb-4">
        <input
          value={tableTitle}
          onChange={(e) => setTableTitle(e.target.value)}
          className="text-2xl font-bold px-2 py-1 border-b-2 border-gray-700 bg-transparent text-gray-100"
          placeholder="Table Title"
        />
      </div>

      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="bg-gray-700/50 text-gray-200 px-3 py-2 rounded-md"
        >
          {allPeriods.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 rounded-md bg-gray-700/50 text-gray-200"
        />

        <button
          onClick={addNewMember}
          className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-lg text-white flex items-center gap-2 shadow-lg transition-transform transform hover:scale-105"
        >
          <Plus size={16} /> Add Member
        </button>

        <button
          onClick={saveChanges}
          className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg text-white flex items-center gap-2 shadow-lg transition-transform transform hover:scale-105"
        >
          <Save size={16} /> Save Changes
        </button>

        <button
          onClick={deleteAllMembers}
          className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-white flex items-center gap-2 shadow-lg transition-transform transform hover:scale-105"
        >
          <Trash2 size={16} /> Delete All
        </button>

        {/* 🆕 START: EXPORT TO EXCEL BUTTON */}
        <button
          onClick={exportToExcel}
          className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-white flex items-center gap-2 shadow-lg transition-transform transform hover:scale-105"
        >
          <Download size={16} /> Export as Excel
        </button>
        {/* 🆕 END: EXPORT TO EXCEL BUTTON */}

        <button
          onClick={addNewFinancialYear}
          className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-lg text-white flex items-center gap-2 shadow-lg transition-transform transform hover:scale-105"
        >
          <FileText size={16} /> New Financial Year
        </button>

        <label
          className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-lg text-white flex items-center gap-2 shadow-lg cursor-pointer transition-transform transform hover:scale-105"
        >
          <Upload size={16} /> Import Excel
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={importFromExcel}
            className="hidden"
          />
        </label>
      </div>

      <div ref={printRef} className="overflow-x-auto rounded-xl shadow-lg border border-gray-700">
        <table className="min-w-max w-full text-left">
          <thead className="bg-gray-800/80 text-gray-200 sticky top-0">
            <tr>
              {[
                "No.", "Name", "No. of Shares", "Amount Shares", "Dividend", "HON",
                "Investment Arrears", "Risk Fund Arrears", "Arrears on Shares", "Arrears on loans",
                "Previous Year Arrears Balance", "Absenteeism", "Arrears On Welfare",
                "Less Advanced", "Net Pay Amount", "ACTIONS"
              ].map(c => (
                <th key={c} className="px-6 py-3 border-b border-gray-700">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((m) => (
              <tr key={m.id || m.no} className="hover:bg-gray-700/50">
                <td className="px-6 py-3 border-b border-gray-700">{m.no}</td>
                <td><input value={m.name} onChange={e => handleChange(m.id!, "name", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.noOfShares} onChange={e => handleChange(m.id!, "noOfShares", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.amountOfShares} onChange={e => handleChange(m.id!, "amountOfShares", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.dividend} onChange={e => handleChange(m.id!, "dividend", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.hon || 0} onChange={e => handleChange(m.id!, "hon", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.investmentArrears || 0} onChange={e => handleChange(m.id!, "investmentArrears", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.riskFundArrears || 0} onChange={e => handleChange(m.id!, "riskFundArrears", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.arrearsOnShares || 0} onChange={e => handleChange(m.id!, "arrearsOnShares", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.arrearsOnLoans || 0} onChange={e => handleChange(m.id!, "arrearsOnLoans", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.prevYearArrearsBalance || 0} onChange={e => handleChange(m.id!, "prevYearArrearsBalance", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.absenteeism || 0} onChange={e => handleChange(m.id!, "absenteeism", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.arrearsOnWelfare || 0} onChange={e => handleChange(m.id!, "arrearsOnWelfare", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.lessAdvanced || 0} onChange={e => handleChange(m.id!, "lessAdvanced", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.netPayAmount || 0} onChange={e => handleChange(m.id!, "netPayAmount", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td>
                  <button onClick={() => deleteMember(m.id)} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg flex items-center gap-1 text-white shadow-lg transition-transform transform hover:scale-105">
                    <Trash2 size={14} /> Delete
                  </button>
                </td>
              </tr>
            ))}

            <tr className="bg-gray-900 text-white font-bold">
              <td className="px-6 py-3 border-b border-gray-700">TOTAL</td>
              <td className="px-6 py-3 border-b border-gray-700"></td>
              <td className="px-6 py-3 border-gray-700">{totals.noOfShares}</td>
              <td className="px-6 py-3 border-gray-700">{totals.amountOfShares}</td>
              <td className="px-6 py-3 border-gray-700">{totals.dividend}</td>
              <td className="px-6 py-3 border-gray-700">{totals.hon}</td>
              <td className="px-6 py-3 border-gray-700">{totals.investmentArrears}</td>
              <td className="px-6 py-3 border-gray-700">{totals.riskFundArrears}</td>
              <td className="px-6 py-3 border-gray-700">{totals.arrearsOnShares}</td>
              <td className="px-6 py-3 border-gray-700">{totals.arrearsOnLoans}</td>
              <td className="px-6 py-3 border-gray-700">{totals.prevYearArrearsBalance}</td>
              <td className="px-6 py-3 border-gray-700">{totals.absenteeism}</td>
              <td className="px-6 py-3 border-gray-700">{totals.arrearsOnWelfare}</td>
              <td className="px-6 py-3 border-gray-700">{totals.lessAdvanced}</td>
              <td className="px-6 py-3 border-gray-700">{totals.netPayAmount}</td>
              <td className="px-6 py-3 border-gray-700"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
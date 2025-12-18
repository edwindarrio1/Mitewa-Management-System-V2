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
  riskFundArrears?: number;
  arrearsOnShares?: number;
  arrearsOnLoans?: number;
  absenteeism?: number;
  arrearsOnWelfare?: number;
  prevArrears?: number;
  lessAdvanced?: number;
  netPayAmount?: number;
  period: string;
}

const DEFAULT_MEMBERS: MemberData[] = [
  { no: 1, name: "MRS. NYORO", noOfShares: 30, amountOfShares: 36000, dividend: 2700, netPayAmount: 38700, period: "2023/2024" },
  { no: 2, name: "MAMA WACHEKE", noOfShares: 100, amountOfShares: 120000, dividend: 9000, netPayAmount: 129000, period: "2023/2024" },
];

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
    if (typeof value === "string") return parseFloat(value) || 0;
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
          setMembers([...DEFAULT_MEMBERS]);
        } else {
          const fetched = snapshot.docs.map((doc) => ({ ...(doc.data() as MemberData), id: doc.id }));
          setMembers(fetched);
        }
      } catch (err) {
        console.error("Error loading members:", err);
        setMembers([...DEFAULT_MEMBERS]);
      }
    };
    fetchMembers();
  }, [selectedPeriod]);

  const handleChange = (no: number, field: keyof MemberData, value: string | number) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.no === no
          ? { ...m, [field]: typeof value === "string" ? toNumber(value) : value }
          : m
      )
    );
  };

  const addNewMember = () => {
    const newMember: MemberData = {
      no: members.filter((m) => m.period === selectedPeriod).length + 1,
      name: "",
      noOfShares: 0,
      amountOfShares: 0,
      dividend: 0,
      hon: 0,
      riskFundArrears: 0,
      arrearsOnShares: 0,
      arrearsOnLoans: 0,
      absenteeism: 0,
      arrearsOnWelfare: 0,
      prevArrears: 0,
      lessAdvanced: 0,
      netPayAmount: 0,
      period: selectedPeriod,
    };
    setMembers((prev) => [...prev, newMember]);
  };

  const deleteMember = (id?: string, no?: number) => {
    if (id) deleteDoc(doc(db, "members", id)).catch((err) => console.error("Delete failed", err));
    setMembers((prev) => prev.filter((m) => m.id !== id && m.no !== no));
  };

  const importFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = new Uint8Array(await file.arrayBuffer());
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json: MemberData[] = XLSX.utils.sheet_to_json(sheet);
    setMembers((prev) => [
      ...prev,
      ...json.map((m, i) => ({ ...m, no: prev.length + i + 1, period: selectedPeriod })),
    ]);
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

    const newMembers = DEFAULT_MEMBERS.map((m) => ({ ...m, period: newPeriod, no: m.no }));
    setMembers(newMembers);
    setSelectedPeriod(newPeriod);

    try {
      for (const member of newMembers) {
        await addDoc(collection(db, "members"), member);
      }
      await setDoc(doc(db, "financialYears", newPeriod), { createdAt: new Date() });
      setAllPeriods((prev) => [...prev, newPeriod]);
    } catch (err) {
      console.error("Error creating new financial year:", err);
    }
  };

  // 🆕 START: EXPORT TO EXCEL FUNCTION
  const exportToExcel = () => {
    const dataToExport = filteredMembers.map(m => ({
        "NO": m.no,
        "NAME": m.name,
        "NO OF SHARES": m.noOfShares,
        "AMOUNT OF SHARES": m.amountOfShares,
        "DIVIDEND": m.dividend,
        "HON": m.hon || 0,
        "RISK FUND ARREARS": m.riskFundArrears || 0,
        "ARREARS ON SHARES": m.arrearsOnShares || 0,
        "ARREARS ON LOANS": m.arrearsOnLoans || 0,
        "ABSENTEEISM/LATENESS": m.absenteeism || 0,
        "ARREARS ON WELFARE": m.arrearsOnWelfare || 0,
        "PREV ARREARS": m.prevArrears || 0,
        "LESS ADVANCED": m.lessAdvanced || 0,
        "NET PAY AMOUNT": m.netPayAmount || 0,
        "PERIOD": m.period,
    }));

    const totalRow = {
        "NO": "TOTAL",
        "NAME": "",
        "NO OF SHARES": totals.noOfShares,
        "AMOUNT OF SHARES": totals.amountOfShares,
        "DIVIDEND": totals.dividend,
        "HON": totals.hon,
        "RISK FUND ARREARS": totals.riskFundArrears,
        "ARREARS ON SHARES": totals.arrearsOnShares,
        "ARREARS ON LOANS": totals.arrearsOnLoans,
        "ABSENTEEISM/LATENESS": totals.absenteeism,
        "ARREARS ON WELFARE": totals.arrearsOnWelfare,
        "PREV ARREARS": totals.prevArrears,
        "LESS ADVANCED": totals.lessAdvanced,
        "NET PAY AMOUNT": totals.netPayAmount,
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
    acc.riskFundArrears += toNumber(m.riskFundArrears);
    acc.arrearsOnShares += toNumber(m.arrearsOnShares);
    acc.arrearsOnLoans += toNumber(m.arrearsOnLoans);
    acc.absenteeism += toNumber(m.absenteeism);
    acc.arrearsOnWelfare += toNumber(m.arrearsOnWelfare);
    acc.prevArrears += toNumber(m.prevArrears);
    acc.lessAdvanced += toNumber(m.lessAdvanced);
    acc.netPayAmount += toNumber(m.netPayAmount);
    return acc;
  }, {
    noOfShares: 0, amountOfShares: 0, dividend: 0, hon: 0, riskFundArrears: 0,
    arrearsOnShares: 0, arrearsOnLoans: 0, absenteeism: 0, arrearsOnWelfare: 0,
    prevArrears: 0, lessAdvanced: 0, netPayAmount: 0
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
              {["NO","NAME","NO OF SHARES","AMOUNT OF SHARES","DIVIDEND","HON","RISK FUND AREARS","ARREARS ON SHARES","ARREARS ON LOANS","ABSENTEEISM/LATENESS","ARREARS ON WELFARE","PREV AREARS","LESS ADVANCED","NET PAY AMOUNT","ACTIONS"].map(c => (
                <th key={c} className="px-6 py-3 border-b border-gray-700">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((m) => (
              <tr key={m.no} className="hover:bg-gray-700/50">
                <td className="px-6 py-3 border-b border-gray-700">{m.no}</td>
                <td><input value={m.name} onChange={e => handleChange(m.no, "name", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.noOfShares} onChange={e => handleChange(m.no, "noOfShares", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.amountOfShares} onChange={e => handleChange(m.no, "amountOfShares", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.dividend} onChange={e => handleChange(m.no, "dividend", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.hon || 0} onChange={e => handleChange(m.no, "hon", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.riskFundArrears || 0} onChange={e => handleChange(m.no, "riskFundArrears", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.arrearsOnShares || 0} onChange={e => handleChange(m.no, "arrearsOnShares", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.arrearsOnLoans || 0} onChange={e => handleChange(m.no, "arrearsOnLoans", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.absenteeism || 0} onChange={e => handleChange(m.no, "absenteeism", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.arrearsOnWelfare || 0} onChange={e => handleChange(m.no, "arrearsOnWelfare", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.prevArrears || 0} onChange={e => handleChange(m.no, "prevArrears", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.lessAdvanced || 0} onChange={e => handleChange(m.no, "lessAdvanced", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td><input type="number" value={m.netPayAmount || 0} onChange={e => handleChange(m.no, "netPayAmount", e.target.value)} className="bg-gray-700/50 text-gray-200 px-2 py-1 w-full" /></td>
                <td>
                  <button onClick={() => deleteMember(m.id, m.no)} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg flex items-center gap-1 text-white shadow-lg transition-transform transform hover:scale-105">
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
              <td className="px-6 py-3 border-gray-700">{totals.riskFundArrears}</td>
              <td className="px-6 py-3 border-gray-700">{totals.arrearsOnShares}</td>
              <td className="px-6 py-3 border-gray-700">{totals.arrearsOnLoans}</td>
              <td className="px-6 py-3 border-gray-700">{totals.absenteeism}</td>
              <td className="px-6 py-3 border-gray-700">{totals.arrearsOnWelfare}</td>
              <td className="px-6 py-3 border-gray-700">{totals.prevArrears}</td>
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
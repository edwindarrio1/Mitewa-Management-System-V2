"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../Admin-Layout";
import * as XLSX from "xlsx";
import React from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

const FIELD_NAMES = [
  "collection_from_shares",
  "shares_arears",
  "loan_given_out",
  "loan_refund",
  "loan_arrears",
  "collection_from_risk_refund",
  "risk_fund_arears",
  "previous_year_arears_recovery",
  "previous_years_balances",
  "welfare_balances",
  "welfare_savings",
  "expenses",
] as const;
type FieldName = (typeof FIELD_NAMES)[number];

/* ---------- FIXED TYPE (ONLY CHANGE) ---------- */
type LedgerRowData = {
  id: string;
} & {
  [K in FieldName]: number;
};
/* ---------------------------------------------- */

type LedgerDataMap = {
  [rowId: string]: LedgerRowData;
};

const MAX_ROWS = 24;

const createEmptyRow = (id: string): LedgerRowData => {
  const row: LedgerRowData = { id } as LedgerRowData;
  FIELD_NAMES.forEach((field) => (row[field] = 0));
  return row;
};

const createInitialLedgerData = (): LedgerDataMap => {
  const data: LedgerDataMap = {};
  for (let i = 1; i <= MAX_ROWS; i++) {
    data[`row_${i}`] = createEmptyRow(`row_${i}`);
  }
  return data;
};

const toNumber = (value: any): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleanedValue = value.replace(/[^0-9.-]+/g, "");
    return parseFloat(cleanedValue) || 0;
  }
  return 0;
};

const getPeriodId = (period: string) => period.replace(/\//g, "-");
const formatHeaderForExport = (header: string) =>
  header.replace(/_/g, " ").toUpperCase();

export default function GeneralLedgerPage() {
  const [ledgerData, setLedgerData] = useState<LedgerDataMap>(
    createInitialLedgerData()
  );
  const [allPeriods, setAllPeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("2023/2024");
  const [isSaving, setIsSaving] = useState(false);

  // Load periods
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const snapshot = await getDocs(collection(db, "financialYears"));
        const years = snapshot.docs
          .map((doc) => (doc.data().name as string) || doc.id.replace(/-/g, "/"))
          .sort();
        if (years.length) {
          setAllPeriods(years);
          setSelectedPeriod(years[years.length - 1]);
        } else {
          setAllPeriods(["2023/2024"]);
          setSelectedPeriod("2023/2024");
        }
      } catch (err) {
        console.error(err);
        setAllPeriods(["2023/2024"]);
        setSelectedPeriod("2023/2024");
      }
    };
    fetchPeriods();
  }, []);

  // Load ledger data
  useEffect(() => {
    const fetchLedgerData = async () => {
      setLedgerData(createInitialLedgerData());
      if (!selectedPeriod) return;
      try {
        const periodId = getPeriodId(selectedPeriod);
        const docRef = doc(db, "generalLedgers", periodId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const fetchedData = docSnap.data() as LedgerDataMap;
          const mergedData: LedgerDataMap = createInitialLedgerData();
          Object.keys(mergedData).forEach((rowId) => {
            if (fetchedData[rowId]) {
              FIELD_NAMES.forEach(
                (field) =>
                  (fetchedData[rowId][field] = toNumber(fetchedData[rowId][field]))
              );
              mergedData[rowId] = fetchedData[rowId];
            }
          });
          setLedgerData(mergedData);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLedgerData();
  }, [selectedPeriod]);

  // Handlers
  const handleCellChange = (rowId: string, field: FieldName, value: string) => {
    setLedgerData((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], [field]: toNumber(value) },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const periodId = getPeriodId(selectedPeriod);
      const docRef = doc(db, "generalLedgers", periodId);
      await setDoc(docRef, ledgerData);
      alert("Ledger data saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving ledger data. Check console.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTable = async () => {
    if (!confirm(`Are you sure you want to delete the entire ledger for ${selectedPeriod}?`))
      return;

    try {
      const periodId = getPeriodId(selectedPeriod);
      await deleteDoc(doc(db, "generalLedgers", periodId));
      setLedgerData(createInitialLedgerData());
      alert("Ledger deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to delete ledger. Check console.");
    }
  };

  const handleAddPeriod = async () => {
    const newPeriod = prompt("Enter the new financial year (e.g., 2024/2025):");
    if (newPeriod && !allPeriods.includes(newPeriod)) {
      try {
        const periodId = getPeriodId(newPeriod);
        await setDoc(doc(db, "financialYears", periodId), {
          created: new Date().toISOString(),
          name: newPeriod,
        });
        setAllPeriods([...allPeriods, newPeriod].sort());
        setSelectedPeriod(newPeriod);
        alert(`Financial year ${newPeriod} created successfully.`);
      } catch (err) {
        console.error(err);
        alert("Failed to add new financial year.");
      }
    } else if (newPeriod) alert("This financial year already exists.");
  };

  const handleExport = () => {
    const columnTotals = calculateColumnTotals();
    const dataToExport = Object.values(ledgerData).map((row, index) => {
      const rowExport: { [key: string]: number | string } = { NO: index + 1 };
      FIELD_NAMES.forEach(
        (field) => (rowExport[formatHeaderForExport(field)] = row[field])
      );
      return rowExport;
    });
    // Total row
    const totalRow: { [key: string]: number | string } = { NO: "Total" };
    FIELD_NAMES.forEach((field) => (totalRow[formatHeaderForExport(field)] = columnTotals[field]));
    dataToExport.push(totalRow);

    const headers = ["NO", ...FIELD_NAMES.map(formatHeaderForExport)];
    const ws = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GeneralLedger");
    XLSX.writeFile(wb, `General_Ledger_${selectedPeriod}.xlsx`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const data = new Uint8Array(await file.arrayBuffer());
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (json.length < 2) return alert("Excel must contain header + at least one row.");

    const headers = json[0] as string[];
    const dataRows = json.slice(1);
    const importedData: LedgerDataMap = { ...ledgerData };

    for (let i = 0; i < Math.min(MAX_ROWS, dataRows.length); i++) {
      const rowId = `row_${i + 1}`;
      const row = importedData[rowId] || createEmptyRow(rowId);
      FIELD_NAMES.forEach((field) => {
        const headerText = formatHeaderForExport(field);
        const colIndex = headers.findIndex((h) => h.toUpperCase() === headerText);
        if (colIndex !== -1 && dataRows[i][colIndex] !== undefined)
          row[field] = toNumber(dataRows[i][colIndex]);
      });
      importedData[rowId] = row;
    }
    setLedgerData(importedData);
    alert(`Imported ${Math.min(MAX_ROWS, dataRows.length)} rows. Remember to save changes!`);
  };

  const calculateColumnTotals = () => {
    const totals: { [key in FieldName]: number } = {} as { [key in FieldName]: number };
    FIELD_NAMES.forEach((field) => (totals[field] = 0));
    Object.values(ledgerData).forEach((row) => {
      FIELD_NAMES.forEach((field) => (totals[field] += toNumber(row[field])));
    });
    return totals;
  };
  const columnTotals = calculateColumnTotals();

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-100">
            💰 Collections & Expenses
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2 md:gap-4 mb-6 items-center">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-gray-700 text-gray-200 px-4 py-2 rounded-lg border border-gray-600 focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-auto min-w-[150px] transition-all"
          >
            {allPeriods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <button
              onClick={handleAddPeriod}
              className="flex-1 sm:flex-none justify-center px-4 py-2 rounded-lg text-white bg-blue-500 hover:bg-blue-600 font-semibold transition-all active:scale-95 text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              ➕ Year
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex-1 sm:flex-none justify-center px-4 py-2 rounded-lg text-white font-semibold transition-all active:scale-95 text-sm flex items-center gap-2 shadow-lg ${isSaving ? "bg-gray-500 cursor-not-allowed" : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                }`}
            >
              {isSaving ? "Saving..." : "💾 Sync All"}
            </button>

            <button
              onClick={handleExport}
              className="flex-1 sm:flex-none justify-center bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg text-white font-semibold transition-all active:scale-95 text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20"
            >
              📊 Excel
            </button>

            <label className="flex-1 sm:flex-none justify-center bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-lg text-white font-semibold cursor-pointer transition-all active:scale-95 text-sm flex items-center gap-2 shadow-lg shadow-yellow-500/20">
              📥 Import
              <input type="file" accept=".xlsx, .xls" onChange={handleImport} className="hidden" />
            </label>

            <button
              onClick={handleDeleteTable}
              className="flex-1 sm:flex-none justify-center px-4 py-2 rounded-lg text-white bg-red-500 hover:bg-red-600 font-semibold transition-all active:scale-95 text-sm flex items-center gap-2 shadow-lg shadow-red-500/20"
            >
              🗑️ Delete
            </button>
          </div>
        </div>

        {/* Ledger Table Container */}
        <div className="w-full overflow-hidden border border-gray-700 rounded-xl shadow-2xl">
          <table className="min-w-max w-full text-left text-gray-200 text-xs">
            <thead className="bg-gray-800/80 sticky top-0">
              <tr>
                <th className="px-3 py-2 border-b border-r border-gray-700 text-center w-12">
                  NO
                </th>
                {FIELD_NAMES.map((field) => (
                  <th
                    key={field}
                    className="px-3 py-2 border-b border-r border-gray-700 text-center whitespace-nowrap"
                  >
                    {formatHeaderForExport(field)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(ledgerData).map((rowId, index) => {
                const row = ledgerData[rowId];
                return (
                  <tr key={rowId} className="hover:bg-gray-700/30">
                    <td className="px-3 py-1 border-b border-r border-gray-700 font-semibold text-center">
                      {index + 1}
                    </td>
                    {FIELD_NAMES.map((field) => (
                      <td
                        key={`${rowId}-${field}`}
                        className="px-1 py-1 border-b border-r border-gray-700"
                      >
                        <input
                          type="number"
                          value={row[field] || ""}
                          onChange={(e) => handleCellChange(rowId, field, e.target.value)}
                          className="bg-transparent text-gray-200 w-full text-right p-0.5 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr className="bg-gray-900 text-white font-extrabold text-sm">
                <td className="px-3 py-2 border-t border-gray-700 border-r text-center">Total</td>
                {FIELD_NAMES.map((field) => (
                  <td
                    key={`total-${field}`}
                    className="px-3 py-2 border-t border-gray-700 border-r text-right"
                  >
                    {columnTotals[field].toLocaleString("en-KE")}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

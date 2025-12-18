"use client";

import { useRef, useState, useEffect } from "react";
import AdminLayout from "../Admin-Layout";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

// Convert period into safe Firestore doc ID
const getPeriodId = (period: string) => period.replace(/\//g, "-");

// Helper function to execute a rich-text command
const applyFormat = (command: string, value: string | null = null) => {
  document.execCommand(command, false, value as string);
};

// -------- STATIC TEMPLATE WITH AUTO-CALC ATTRIBUTES --------
const getReportTemplateHtml = (currentYear: string): string => {
  const [year1, year2] = currentYear.split("/");

  return `
  <div class="report-template">
      <h1 class="text-2xl font-bold text-emerald-700 text-center uppercase">
          MITEWA Treasurer’s Report for the Year ${currentYear}
      </h1>

      <section>
          <h2 class="text-lg font-semibold mb-2 text-emerald-600">
              1. Quarterly Contributions and Loans
          </h2>
          <table class="w-full border border-gray-300 text-sm">
              <thead class="bg-emerald-50">
                  <tr>
                      <th class="border p-2 font-semibold">No</th>
                      <th class="border p-2 font-semibold">Quarter</th>
                      <th class="border p-2 font-semibold">Loan Contributions</th>
                      <th class="border p-2 font-semibold">Investment Contributions</th>
                      <th class="border p-2 font-semibold">Total Contributions</th>
                      <th class="border p-2 font-semibold">Loan Given Out</th>
                  </tr>
              </thead>
              <tbody>
                  <tr class="odd:bg-gray-50">
                      <td class="border p-2 text-center">1</td>
                      <td class="border p-2">Aug–Oct ${year1}</td>
                      <td class="border p-2 text-right" contenteditable data-calc="sum" data-group="loan">237500</td>
                      <td class="border p-2 text-right" contenteditable data-calc="sum" data-group="invest">268500</td>
                      <td class="border p-2 text-right" data-total-row data-group="totalContrib">0</td>
                      <td class="border p-2 text-right" contenteditable data-calc="sum" data-group="loanOut">1033000</td>
                  </tr>
                  <tr class="odd:bg-gray-50">
                      <td class="border p-2 text-center">2</td>
                      <td class="border p-2">Nov ${year1}–Jan ${year2}</td>
                      <td class="border p-2 text-right" contenteditable data-calc="sum" data-group="loan">237500</td>
                      <td class="border p-2 text-right" contenteditable data-calc="sum" data-group="invest">268500</td>
                      <td class="border p-2 text-right" data-total-row data-group="totalContrib">0</td>
                      <td class="border p-2 text-right" contenteditable data-calc="sum" data-group="loanOut">450000</td>
                  </tr>
                  <tr class="odd:bg-gray-50">
                      <td class="border p-2 text-center">3</td>
                      <td class="border p-2">Feb–Apr ${year2}</td>
                      <td class="border p-2 text-right" contenteditable data-calc="sum" data-group="loan">237500</td>
                      <td class="border p-2 text-right" contenteditable data-calc="sum" data-group="invest">268500</td>
                      <td class="border p-2 text-right" data-total-row data-group="totalContrib">0</td>
                      <td class="border p-2 text-right" contenteditable data-calc="sum" data-group="loanOut">60000</td>
                  </tr>
                  <tr class="odd:bg-gray-50">
                      <td class="border p-2 text-center">4</td>
                      <td class="border p-2">May–July ${year2}</td>
                      <td class="border p-2 text-right" contenteditable data-calc="sum" data-group="loan">237500</td>
                      <td class="border p-2 text-right" contenteditable data-calc="sum" data-group="invest">268500</td>
                      <td class="border p-2 text-right" data-total-row data-group="totalContrib">0</td>
                      <td class="border p-2 text-right" contenteditable data-calc="sum" data-group="loanOut">50000</td>
                  </tr>
                  <tr class="font-bold bg-gray-100">
                      <td colspan="2" class="border p-2 text-center">Total</td>
                      <td class="border p-2 text-right" data-total-col data-group="loan">0</td>
                      <td class="border p-2 text-right" data-total-col data-group="invest">0</td>
                      <td class="border p-2 text-right" data-total-col data-group="totalContrib">0</td>
                      <td class="border p-2 text-right" data-total-col data-group="loanOut">0</td>
                  </tr>
              </tbody>
          </table>
      </section>

      <footer class="pt-4 border-t border-gray-300 text-sm">
          <p><strong>Prepared by:</strong> KARUKI E.N</p>
          <p><strong>Position:</strong> Treasurer</p>
      </footer>
  </div>
  `;
};

// ----------- COMPONENT -----------

export default function ReportsPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [year, setYear] = useState("2024/2025");
  const [reportContent, setReportContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const reportDocId = `treasurer_report_${getPeriodId(year)}`;

  // Load report content
  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, "reports", reportDocId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setReportContent(docSnap.data().content || "");
        } else {
          setReportContent(getReportTemplateHtml(year));
        }
      } catch (err) {
        console.error("Error loading:", err);
        setReportContent(getReportTemplateHtml(year));
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [year, reportDocId]);

  // Save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (printRef.current) {
        printRef.current.setAttribute("contenteditable", "false");
      }

      await setDoc(doc(db, "reports", reportDocId), {
        content: reportContent,
        year: year,
        lastUpdated: new Date().toISOString(),
      });
      alert("Saved!");
    } catch (err) {
      alert("Save failed!");
    } finally {
      setIsSaving(false);
      if (printRef.current) {
        printRef.current.setAttribute("contenteditable", "true");
      }
    }
  };

  // ---------- WORD EXPORT (NO FILE-SAVER) ----------
  const handleExportWord = async () => {
    if (!reportContent) return;

    try {
      const content = `<html><head><meta charset="utf-8" /></head><body>${reportContent}</body></html>`;
      const blob = new Blob([content], { type: "application/msword" });

      // Pure browser download (no file-saver)
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `MITEWA_Report_${getPeriodId(year)}.doc`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Word export failed:", error);
    }
  };

  // -------- AUTO-CALC FOR TABLES --------
  useEffect(() => {
    const recalcTotals = () => {
      const tables = printRef.current?.querySelectorAll("table");
      tables?.forEach((table) => {
        let columns: { [key: string]: number } = {};

        table.querySelectorAll("td[data-calc]").forEach((cell) => {
          const group = cell.getAttribute("data-group")!;
          const value = parseFloat((cell.textContent || "0").replace(/,/g, "")) || 0;
          columns[group] = (columns[group] || 0) + value;
        });

        columns["totalContrib"] = 0;

        table.querySelectorAll("td[data-total-row]").forEach((cell) => {
          const group = cell.getAttribute("data-group")!;
          if (group === "totalContrib") {
            const row = cell.parentElement;
            if (row) {
              const loanCell = row.querySelector('td[data-group="loan"]');
              const investCell = row.querySelector('td[data-group="invest"]');

              const loan = parseFloat((loanCell?.textContent || "0").replace(/,/g, "")) || 0;
              const invest = parseFloat((investCell?.textContent || "0").replace(/,/g, "")) || 0;

              const rowTotal = loan + invest;
              cell.textContent = rowTotal.toLocaleString("en-KE");

              columns[group] = (columns[group] || 0) + rowTotal;
            }
          }
        });

        table.querySelectorAll("td[data-total-col]").forEach((cell) => {
          const group = cell.getAttribute("data-group")!;
          if (group && columns[group] !== undefined) {
            cell.textContent = columns[group].toLocaleString("en-KE");
          }
        });
      });
    };

    const handleInput = () => {
      recalcTotals();
      if (printRef.current) {
        setReportContent(printRef.current.innerHTML);
      }
    };

    recalcTotals();
    printRef.current?.addEventListener("input", handleInput);

    return () => printRef.current?.removeEventListener("input", handleInput);
  }, [reportContent]);

  // Rich-Text formatting
  const handleFormat = (command: string, value: string | null = null) => {
    printRef.current?.focus();
    applyFormat(command, value);

    if (printRef.current) {
      setReportContent(printRef.current.innerHTML);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 p-6 text-gray-900 dark:text-gray-100">

        {/* Header */}
        <div className="flex flex-col gap-2 bg-emerald-700 text-white px-6 py-3 rounded-md shadow print:hidden">

          {/* Top Row */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">MITEWA Treasurer’s Report</h1>

            <div className="flex items-center gap-3">
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="border border-gray-300 text-gray-900 rounded-md px-3 py-1 text-sm"
              />

              <button
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className={`px-4 py-2 rounded-md text-white text-sm font-medium shadow transition-colors ${
                  isSaving || isLoading
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSaving ? "Saving..." : "💾 Save"}
              </button>

              {/* ❌ REMOVED PRINT BUTTON */}
            </div>
          </div>

          {/* Bottom Row */}
          <div className="flex items-center justify-between pt-2 border-t border-emerald-600">

            {/* Editor Tools */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFormat("bold")}
                title="Bold"
                className="w-8 h-8 rounded hover:bg-emerald-600 font-bold text-lg leading-none"
              >
                B
              </button>
              <button
                onClick={() => handleFormat("italic")}
                title="Italic"
                className="w-8 h-8 rounded hover:bg-emerald-600 italic text-lg leading-none"
              >
                I
              </button>
              <button
                onClick={() => handleFormat("underline")}
                title="Underline"
                className="w-8 h-8 rounded hover:bg-emerald-600 underline text-lg leading-none"
              >
                U
              </button>
              <div className="w-px h-6 bg-emerald-600 mx-2"></div>
              <button
                onClick={() => handleFormat("insertUnorderedList")}
                title="Bullet List"
                className="w-8 h-8 rounded hover:bg-emerald-600"
              >
                •
              </button>
              <button
                onClick={() => handleFormat("insertOrderedList")}
                title="Numbered List"
                className="w-8 h-8 rounded hover:bg-emerald-600"
              >
                #
              </button>
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-3">

              {/* ❌ REMOVED Export PDF BUTTON */}

              <button
                onClick={handleExportWord}
                className="bg-emerald-600 hover:bg-emerald-800 px-4 py-2 rounded-md text-white text-sm font-medium shadow transition-colors"
              >
                Export Word
              </button>
            </div>
          </div>
        </div>

        {/* Report Area */}
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-20 text-center">
            <p className="text-lg text-gray-500">Loading report for {year}...</p>
          </div>
        ) : (
          <div
            ref={printRef}
            dangerouslySetInnerHTML={{ __html: reportContent }}
            contentEditable
            suppressContentEditableWarning
            className="report-container bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-md p-6 space-y-8 border border-gray-200 dark:border-gray-700 min-h-[800px] prose prose-sm max-w-none"
          />
        )}
      </div>
    </AdminLayout>
  );
}

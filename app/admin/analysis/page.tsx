"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "../components/ui/card";
import AdminLayout from "../Admin-Layout";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

export default function AnalysisPage() {
  const [quarterlyData, setQuarterlyData] = useState<{ quarter: string; loan: number; invest: number; loanOut: number }[]>([]);
  const [expenditures, setExpenditures] = useState<{ name: string; amount: number }[]>([]);
  const [dividends, setDividends] = useState<{ shares: number; amount: number }[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("2023/2024");

  // Fetch data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const periodId = selectedPeriod.replace(/\//g, "-");

        // 1️⃣ Fetch general ledger for the selected period
        const ledgerDoc = await getDoc(doc(db, "generalLedgers", periodId));
        if (ledgerDoc.exists()) {
          const data = ledgerDoc.data();
          const rows = Object.values(data || {}) as any[];

          // Quarterly contributions
          const qData: any[] = [];
          if (rows.length >= 4) {
            qData.push(
              {
                quarter: "Aug–Oct",
                loan: rows[0].loan_given_out || 0,
                invest: rows[0].collection_from_shares || 0,
                loanOut: rows[0].loan_given_out || 0,
              },
              {
                quarter: "Nov–Jan",
                loan: rows[1].loan_given_out || 0,
                invest: rows[1].collection_from_shares || 0,
                loanOut: rows[1].loan_given_out || 0,
              },
              {
                quarter: "Feb–Apr",
                loan: rows[2].loan_given_out || 0,
                invest: rows[2].collection_from_shares || 0,
                loanOut: rows[2].loan_given_out || 0,
              },
              {
                quarter: "May–Jul",
                loan: rows[3].loan_given_out || 0,
                invest: rows[3].collection_from_shares || 0,
                loanOut: rows[3].loan_given_out || 0,
              }
            );
          }
          setQuarterlyData(qData);

          // Expenditures (sum all rows' expenses)
          const expData = rows.map(r => ({ name: "Expense", amount: r.expenses || 0 }));
          setExpenditures(expData);

          // Dividends (example: use welfare_balances / shares)
          const divData = rows.map(r => ({ shares: r.shares_arears || 0, amount: r.welfare_balances || 0 }));
          setDividends(divData);
        }
      } catch (err) {
        console.error("Error fetching analysis data:", err);
      }
    };

    fetchData();
  }, [selectedPeriod]);

  // Totals
  const totalLoan = quarterlyData.reduce((acc, q) => acc + q.loan, 0);
  const totalInvest = quarterlyData.reduce((acc, q) => acc + q.invest, 0);
  const totalLoansOut = quarterlyData.reduce((acc, q) => acc + q.loanOut, 0);
  const totalExpenditures = expenditures.reduce((acc, e) => acc + e.amount, 0);
  const totalDividends = dividends.reduce((acc, d) => acc + d.amount, 0);

  const pieData = [
    { name: "Loans", value: totalLoan },
    { name: "Investments", value: totalInvest },
    { name: "Expenditures", value: totalExpenditures },
    { name: "Dividends", value: totalDividends },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8 p-6 text-gray-900 dark:text-gray-100">
        <h1 className="text-3xl font-bold text-green-600 dark:text-emerald-400">
          MITEWA Treasurer’s Financial Analysis {selectedPeriod}
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 shadow-sm">
            <CardContent>
              <h3 className="text-sm text-gray-500 dark:text-gray-400">Total Loan Contributions</h3>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">{totalLoan.toLocaleString()} KSh</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 shadow-sm">
            <CardContent>
              <h3 className="text-sm text-gray-500 dark:text-gray-400">Total Investment Contributions</h3>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{totalInvest.toLocaleString()} KSh</p>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 shadow-sm">
            <CardContent>
              <h3 className="text-sm text-gray-500 dark:text-gray-400">Total Loans Given Out</h3>
              <p className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{totalLoansOut.toLocaleString()} KSh</p>
            </CardContent>
          </Card>

          <Card className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 shadow-sm">
            <CardContent>
              <h3 className="text-sm text-gray-500 dark:text-gray-400">Total Expenditures</h3>
              <p className="text-xl font-bold text-red-700 dark:text-red-400">{totalExpenditures.toLocaleString()} KSh</p>
            </CardContent>
          </Card>
        </div>

        {/* Bar Chart */}
        <Card className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700">
          <CardContent>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Quarterly Contributions and Loans</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={quarterlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                <XAxis dataKey="quarter" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Legend />
                <Bar dataKey="loan" fill="#22c55e" name="Loan Contributions" />
                <Bar dataKey="invest" fill="#3b82f6" name="Investment Contributions" />
                <Bar dataKey="loanOut" fill="#f59e0b" name="Loans Given Out" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700">
          <CardContent>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Overall Financial Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toLocaleString()} KSh`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart */}
        <Card className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700">
          <CardContent>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Dividend Distribution by Shares</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dividends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="shares" label={{ value: "Shares", position: "insideBottom", offset: -5 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" name="Dividend (KSh)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-10">
          Prepared by: <span className="font-semibold text-gray-700 dark:text-gray-200">KARUKI E.N</span> — Treasurer
        </div>
      </div>
    </AdminLayout>
  );
}

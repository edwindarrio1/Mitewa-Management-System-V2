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
import { collection, getDocs, collectionGroup } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AnalysisPage() {
  const [quarterlyData, setQuarterlyData] = useState<{ quarter: string; loans: number; savings: number; members: number }[]>([]);
  const [expenditures, setExpenditures] = useState<{ name: string; amount: number }[]>([]);
  const [memberStats, setMemberStats] = useState<{ name: string; shares: number; dividend: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch actual data from Firebase collections
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1️⃣ Fetch LOANS data
        const loansSnapshot = await getDocs(collection(db, "loans"));
        const loans = loansSnapshot.docs.map(doc => doc.data());
        const totalLoans = loans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
        const activeLoans = loans.filter(l => (l.balance || 0) > 0).length;

        // 2️⃣ Fetch MEMBERS data
        const membersSnapshot = await getDocs(collection(db, "members"));
        const members = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalMembers = members.length;
        const totalShares = members.reduce((sum, m: any) => sum + (m.amountOfShares || 0), 0);
        const totalDividends = members.reduce((sum, m: any) => sum + (m.dividend || 0), 0);

        // 3️⃣ Fetch SAVINGS data (using collectionGroup)
        const savingsSnapshot = await getDocs(collectionGroup(db, "savings"));
        const savings = savingsSnapshot.docs.map(doc => doc.data());
        const totalSavings = savings.reduce((sum, s) => sum + (s.amount || 0), 0);

        // 4️⃣ Fetch EXPENSES data
        const expensesSnapshot = await getDocs(collection(db, "expenses"));
        const expenses = expensesSnapshot.docs.map(doc => doc.data());
        const totalExpenses = expenses.reduce((sum, e: any) => sum + (e.amount || 0), 0);

        // 5️⃣ Create Quarterly Data (distribute evenly across quarters for demo)
        const quarterlyLoans = totalLoans / 4;
        const quarterlySavings = totalSavings / 4;
        const quarterlyMembers = totalMembers / 4;

        setQuarterlyData([
          { quarter: "Aug–Oct", loans: quarterlyLoans, savings: quarterlySavings, members: Math.ceil(quarterlyMembers) },
          { quarter: "Nov–Jan", loans: quarterlyLoans, savings: quarterlySavings, members: Math.ceil(quarterlyMembers) },
          { quarter: "Feb–Apr", loans: quarterlyLoans, savings: quarterlySavings, members: Math.ceil(quarterlyMembers) },
          { quarter: "May–Jul", loans: quarterlyLoans, savings: quarterlySavings, members: Math.ceil(quarterlyMembers) },
        ]);

        // 6️⃣ Create Expenditure Breakdown
        const expensesByCategory: { [key: string]: number } = {};
        expenses.forEach((expense: any) => {
          const category = expense.category || expense.name || "Other";
          expensesByCategory[category] = (expensesByCategory[category] || 0) + (expense.amount || 0);
        });

        const expData = Object.entries(expensesByCategory).map(([name, amount]) => ({
          name,
          amount: amount as number
        }));

        // Add default categories if no expenses exist
        if (expData.length === 0) {
          expData.push(
            { name: "School Fees", amount: 0 },
            { name: "Risk Fund", amount: 0 },
            { name: "Welfare", amount: 0 },
            { name: "Administrative", amount: 0 }
          );
        }

        setExpenditures(expData);

        // 7️⃣ Create Member Statistics (top 10 members by shares)
        const topMembers = members
          .sort((a: any, b: any) => (b.amountOfShares || 0) - (a.amountOfShares || 0))
          .slice(0, 10)
          .map((m: any) => ({
            name: m.name || "Unknown",
            shares: m.amountOfShares || 0,
            dividend: m.dividend || 0
          }));

        setMemberStats(topMembers);

      } catch (err) {
        console.error("Error fetching analysis data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate totals
  const totalLoan = quarterlyData.reduce((acc, q) => acc + q.loans, 0);
  const totalSavings = quarterlyData.reduce((acc, q) => acc + q.savings, 0);
  const totalMembers = quarterlyData.reduce((acc, q) => acc + q.members, 0);
  const totalExpenditures = expenditures.reduce((acc, e) => acc + e.amount, 0);
  const totalDividends = memberStats.reduce((acc, m) => acc + m.dividend, 0);

  const pieData = [
    { name: "Total Loans", value: totalLoan },
    { name: "Total Savings", value: totalSavings },
    { name: "Total Expenditures", value: totalExpenditures },
    { name: "Total Dividends", value: totalDividends },
  ].filter(item => item.value > 0); // Only show non-zero values

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading analysis data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8 p-6 text-gray-900 dark:text-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-green-600 dark:text-emerald-400">
            MITEWA Financial Analysis Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Real-time data from your database
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 shadow-sm">
            <CardContent>
              <h3 className="text-sm text-gray-500 dark:text-gray-400">Total Loans</h3>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">
                {totalLoan.toLocaleString()} KES
              </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 shadow-sm">
            <CardContent>
              <h3 className="text-sm text-gray-500 dark:text-gray-400">Total Savings</h3>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                {totalSavings.toLocaleString()} KES
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 shadow-sm">
            <CardContent>
              <h3 className="text-sm text-gray-500 dark:text-gray-400">Total Members</h3>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-400">
                {Math.ceil(totalMembers)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 shadow-sm">
            <CardContent>
              <h3 className="text-sm text-gray-500 dark:text-gray-400">Total Expenditures</h3>
              <p className="text-xl font-bold text-red-700 dark:text-red-400">
                {totalExpenditures.toLocaleString()} KES
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bar Chart - Quarterly Overview */}
        <Card className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700">
          <CardContent>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
              Quarterly Overview
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={quarterlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="quarter" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                <Legend />
                <Bar dataKey="loans" fill="#22c55e" name="Loans (KES)" />
                <Bar dataKey="savings" fill="#3b82f6" name="Savings (KES)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Financial Distribution */}
        <Card className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700">
          <CardContent>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
              Financial Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toLocaleString()} KES`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart - Expenditure Breakdown */}
        <Card className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700">
          <CardContent>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
              Expenditure by Category
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expenditures}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                <Legend />
                <Bar dataKey="amount" fill="#f59e0b" name="Amount (KES)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart - Member Dividends */}
        <Card className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700">
          <CardContent>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
              Top Members - Shares vs Dividends
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={memberStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#888" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                <Legend />
                <Line type="monotone" dataKey="shares" stroke="#3b82f6" name="Shares (KES)" strokeWidth={2} />
                <Line type="monotone" dataKey="dividend" stroke="#8b5cf6" name="Dividend (KES)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-10">
          Data refreshed from Firebase Collections • {new Date().toLocaleDateString()}
        </div>
      </div>
    </AdminLayout>
  );
}

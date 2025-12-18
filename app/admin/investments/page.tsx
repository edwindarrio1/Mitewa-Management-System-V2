"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../Admin-Layout";
import { DEFAULT_MEMBERS } from "../components/defaultMembers"; 
import * as XLSX from "xlsx";
import React from 'react';
import {
    collection,
    getDocs,
    doc,
    setDoc,
    query,
    where,
    getDoc,
    addDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

const MONTHS: (keyof MonthlyData)[] = [
    "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY"
];

interface MonthlyData {
    AUGUST: number; SEPTEMBER: number; OCTOBER: number; NOVEMBER: number; DECEMBER: number;
    JANUARY: number; FEBRUARY: number; MARCH: number; APRIL: number; MAY: number;
    JUNE: number; JULY: number;
}

interface MemberData {
    id: string; 
    name: string;
    period: string;
    type?: string; 
}

interface Contribution extends MonthlyData {
    id: string;
    name: string;
    period: string;
    type: "INVEST" | "RISK";
    TOTAL: number;
}

type ContributionsMap = {
    [memberId: string]: {
        INVEST: Contribution;
        RISK: Contribution;
    };
};

const createEmptyMonthlyData = (): MonthlyData => 
    MONTHS.reduce((acc, month) => ({ ...acc, [month]: 0 }), {} as MonthlyData);

const toNumber = (value: any): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const cleanedValue = value.replace(/[^0-9.-]+/g, "");
        return parseFloat(cleanedValue) || 0;
    }
    return 0;
};

const getPeriodId = (period: string) => period.replace(/\//g, "-");

const calculateTotal = (data: MonthlyData): number => {
    const monthlyData = data as MonthlyData;
    return MONTHS.reduce((sum, month) => sum + toNumber(monthlyData[month]), 0);
};

export default function RiskInvestmentPage() {
    const [members, setMembers] = useState<MemberData[]>([]);
    const [contributions, setContributions] = useState<ContributionsMap>({});
    const [allPeriods, setAllPeriods] = useState<string[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState("2023/2024");
    const [isSaving, setIsSaving] = useState(false);

    // --- Load financial periods ---
    useEffect(() => {
        const fetchPeriods = async () => {
            try {
                const snapshot = await getDocs(collection(db, "financialYears"));
                const years = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return (data.name as string) || doc.id.replace(/-/g, "/");
                }).sort();
                if (years.length) {
                    setAllPeriods(years);
                    setSelectedPeriod(years[years.length - 1]);
                } else {
                    const defaultPeriod = "2023/2024";
                    setAllPeriods([defaultPeriod]);
                    setSelectedPeriod(defaultPeriod);
                }
            } catch (err) {
                console.error("Error loading periods:", err);
                const defaultPeriod = "2023/2024";
                setAllPeriods([defaultPeriod]);
                setSelectedPeriod(defaultPeriod);
            }
        };
        fetchPeriods();
    }, []);

    // --- Load members and contributions ---
    useEffect(() => {
        const fetchAllData = async () => {
            setContributions({});
            try {
                const periodId = getPeriodId(selectedPeriod);

                const membersQuery = query(collection(db, "members"), where("period", "==", selectedPeriod));
                const memberSnapshot = await getDocs(membersQuery);

                let fetchedMembers: MemberData[] = [];
                if (memberSnapshot.empty) {
                    fetchedMembers = DEFAULT_MEMBERS.map((m, i) => ({
                        id: `default-${i}-${selectedPeriod}`,
                        name: m.name,
                        period: selectedPeriod,
                    }));
                } else {
                    fetchedMembers = memberSnapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...(doc.data() as Omit<MemberData, 'id'>),
                    }));
                }
                setMembers(fetchedMembers);

                const newContributions: ContributionsMap = {};
                await Promise.all(fetchedMembers.map(async member => {
                    const baseContribution = { id: member.id, name: member.name, period: selectedPeriod };
                    const memberContrib: { INVEST: Contribution, RISK: Contribution } = {
                        INVEST: { ...baseContribution, type: "INVEST", TOTAL: 0, ...createEmptyMonthlyData() },
                        RISK: { ...baseContribution, type: "RISK", TOTAL: 0, ...createEmptyMonthlyData() },
                    };

                    if (!member.id.startsWith('default-')) {
                        const investRef = doc(db, "members", member.id, "contributions_period", periodId, "INVEST_data", "INVEST");
                        const riskRef = doc(db, "members", member.id, "contributions_period", periodId, "RISK_data", "RISK");
                        const [investSnap, riskSnap] = await Promise.all([getDoc(investRef), getDoc(riskRef)]);
                        if (investSnap.exists()) {
                            const data = investSnap.data() as Omit<Contribution, 'id' | 'name' | 'period'>;
                            memberContrib.INVEST = { ...memberContrib.INVEST, ...data, TOTAL: calculateTotal(data as MonthlyData) };
                        }
                        if (riskSnap.exists()) {
                            const data = riskSnap.data() as Omit<Contribution, 'id' | 'name' | 'period'>;
                            memberContrib.RISK = { ...memberContrib.RISK, ...data, TOTAL: calculateTotal(data as MonthlyData) };
                        }
                    }
                    newContributions[member.id] = memberContrib;
                }));

                setContributions(newContributions);
            } catch (err) {
                console.error("Error loading data:", err);
            }
        };
        if (selectedPeriod) fetchAllData();
    }, [selectedPeriod]);

    // --- Handle contribution input changes ---
    const handleContributionChange = (memberId: string, type: "INVEST" | "RISK", month: keyof MonthlyData, value: string | number) => {
        setContributions(prev => {
            const memberData = prev[memberId];
            if (!memberData) return prev;

            const updatedMember = { ...memberData };
            updatedMember[type] = { ...updatedMember[type], [month]: toNumber(value) };
            updatedMember[type].TOTAL = calculateTotal(updatedMember[type]);

            return { ...prev, [memberId]: updatedMember };
        });
    };

    // --- Save contributions ---
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedMembers = [...members];
            const periodId = getPeriodId(selectedPeriod);

            await Promise.all(
                members.map(async (member, index) => {
                    const memberData = contributions[member.id];
                    if (!memberData) return;

                    let currentMemberId = member.id;

                    if (member.id.startsWith('temp-import-') || member.id.startsWith('default-')) {
                        const newDocRef = await addDoc(collection(db, "members"), {
                            name: member.name,
                            period: selectedPeriod,
                            createdAt: new Date().toISOString(),
                        });
                        currentMemberId = newDocRef.id;
                        updatedMembers[index] = { ...member, id: currentMemberId };
                        contributions[currentMemberId] = memberData;
                        delete contributions[member.id];
                    }

                    const periodDocRef = doc(db, "members", currentMemberId, "contributions_period", periodId);

                    const { id: investId, name: investName, period: investPeriod, ...investDataToSave } = memberData.INVEST;
                    const { id: riskId, name: riskName, period: riskPeriod, ...riskDataToSave } = memberData.RISK;

                    const investRef = doc(collection(periodDocRef, "INVEST_data"), "INVEST");
                    await setDoc(investRef, investDataToSave);

                    const riskRef = doc(collection(periodDocRef, "RISK_data"), "RISK");
                    await setDoc(riskRef, riskDataToSave);
                })
            );

            setMembers(updatedMembers);
            alert("Contributions and new members saved successfully!");
        } catch (err) {
            console.error("Error saving contributions:", err);
            alert("Error saving contributions. Check console for details.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Add new financial year ---
    const handleAddPeriod = async () => {
        const newPeriod = prompt("Enter the new financial year (e.g., 2024/2025):");
        if (newPeriod && !allPeriods.includes(newPeriod)) {
            try {
                const periodId = getPeriodId(newPeriod);
                await setDoc(doc(db, "financialYears", periodId), { created: new Date().toISOString(), name: newPeriod });
                const updatedPeriods = [...allPeriods, newPeriod].sort();
                setAllPeriods(updatedPeriods);
                setSelectedPeriod(newPeriod);
                alert(`Financial year ${newPeriod} created successfully.`);
            } catch (error) {
                console.error("Error adding new period:", error);
                alert("Failed to add new financial year.");
            }
        } else if (newPeriod) alert("This financial year already exists.");
    };

    // --- Excel export ---
    const handleExport = () => {
        const dataToExport: any[] = [];
        members.forEach(member => {
            const contribData = contributions[member.id];
            if (!contribData) return;

            dataToExport.push({
                'NAMES': member.name,
                'CATEGORY': 'INVEST',
                ...MONTHS.reduce((acc, month) => ({ ...acc, [month]: contribData.INVEST[month] }), {}),
                'TOTAL': contribData.INVEST.TOTAL,
            });
            dataToExport.push({
                'NAMES': member.name,
                'CATEGORY': 'RISK',
                ...MONTHS.reduce((acc, month) => ({ ...acc, [month]: contribData.RISK[month] }), {}),
                'TOTAL': contribData.RISK.TOTAL,
            });
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport, { header: ['NAMES', 'CATEGORY', ...MONTHS, 'TOTAL'] });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Contributions");
        XLSX.writeFile(wb, `Member_Contributions_${selectedPeriod}.xlsx`);
    };

    // --- Excel import ---
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        const data = new Uint8Array(await file.arrayBuffer());
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (json.length < 2) { alert("Excel must have headers + data"); return; }

        const headers = json[0] as string[];
        const dataRows = json.slice(1);
        const importedContributions: ContributionsMap = { ...contributions };
        const tempMap: { [key: string]: { INVEST?: Contribution, RISK?: Contribution } } = {};
        const existingMemberMap = new Map(members.map(m => [m.name.trim().toUpperCase(), m.id]));

        dataRows.forEach(row => {
            const nameIndex = headers.findIndex(h => h.toUpperCase() === 'NAMES');
            const categoryIndex = headers.findIndex(h => h.toUpperCase() === 'CATEGORY');
            if (nameIndex === -1 || categoryIndex === -1) return;

            const name = (row[nameIndex] || '').toString().trim();
            const type = (row[categoryIndex] || '').toString().toUpperCase() as 'INVEST' | 'RISK';
            if (!name || (type !== 'INVEST' && type !== 'RISK')) return;

            const mapKey = name.toUpperCase(); 
            let memberId = existingMemberMap.get(mapKey) || `temp-import-${btoa(name).replace(/=/g, '')}`;
            const contributionData: any = { id: memberId, name, period: selectedPeriod, type };
            MONTHS.forEach(month => {
                const monthIndex = headers.findIndex(h => h.toUpperCase() === month);
                contributionData[month] = monthIndex !== -1 ? toNumber(row[monthIndex]) : 0;
            });
            contributionData.TOTAL = calculateTotal(contributionData);

            if (!tempMap[memberId]) tempMap[memberId] = {};
            tempMap[memberId][type] = contributionData as Contribution;
        });

        const newMembers: MemberData[] = [...members];
        let importedCount = 0;

        Object.keys(tempMap).forEach(memberId => {
            const currentMemberData = importedContributions[memberId];
            const importedData = tempMap[memberId];

            if (!currentMemberData) {
                const newMemberName = importedData.INVEST?.name || importedData.RISK?.name || memberId;
                const newMember: MemberData = { id: memberId, name: newMemberName, period: selectedPeriod };
                newMembers.push(newMember);
                importedContributions[memberId] = {
                    INVEST: importedData.INVEST || { ...newMember, type: "INVEST", TOTAL: 0, ...createEmptyMonthlyData() } as Contribution,
                    RISK: importedData.RISK || { ...newMember, type: "RISK", TOTAL: 0, ...createEmptyMonthlyData() } as Contribution,
                };
            } else {
                importedContributions[memberId] = {
                    INVEST: importedData.INVEST || currentMemberData.INVEST,
                    RISK: importedData.RISK || currentMemberData.RISK,
                };
            }
            importedCount++;
        });

        setMembers(newMembers);
        setContributions(importedContributions);
        alert(`Imported ${importedCount} member contribution sets. Remember to save changes!`);
    };

    const calculateColumnTotals = () => {
        const columnTotals = MONTHS.reduce((acc, month) => ({ ...acc, [month]: 0 }), {} as MonthlyData);
        let grandTotal = 0;

        Object.values(contributions).forEach(memberContrib => {
            const invest = memberContrib.INVEST;
            const risk = memberContrib.RISK;
            MONTHS.forEach(month => {
                columnTotals[month] += toNumber(invest[month]) + toNumber(risk[month]);
            });
            grandTotal += invest.TOTAL + risk.TOTAL;
        });
        return { columnTotals, grandTotal };
    };

    const { columnTotals, grandTotal } = calculateColumnTotals();

    return (
        <AdminLayout>
            <div className="mb-4">
                <h2 className="text-2xl font-bold px-2 py-1 text-gray-100">
                    Risk & Investment Contributions
                </h2>
            </div>

            <hr className="border-gray-700 my-4" />

            {/* Controls */}
            <div className="flex flex-wrap gap-4 mb-6 items-center">
                <select
                    value={selectedPeriod}
                    onChange={e => setSelectedPeriod(e.target.value)}
                    className="bg-gray-700/50 text-gray-200 px-3 py-2 rounded-md"
                >
                    {allPeriods.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <button 
                    onClick={handleAddPeriod}
                    className="px-4 py-2 rounded-lg text-white bg-blue-500 hover:bg-blue-600"
                >
                    ➕ Add Financial Year
                </button>

                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className={`px-4 py-2 rounded-lg text-white ${isSaving ? 'bg-gray-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                >
                    {isSaving ? "Saving..." : "💾 Save All Contributions"}
                </button>

                <button onClick={handleExport} className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg text-white">
                    📊 Export Excel
                </button>

                <label className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-lg text-white cursor-pointer">
                    📥 Import Excel
                    <input type="file" accept=".xlsx, .xls" onChange={handleImport} className="hidden" />
                </label>
            </div>

            <hr className="border-gray-700 my-4" />

            <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-700">
                <table className="min-w-max w-full text-left text-gray-200 text-xs">
                    <thead className="bg-gray-800/80 sticky top-0">
                        <tr>
                            <th className="px-3 py-2 border-b border-r border-gray-700 text-center w-1/12" rowSpan={2}>NAMES</th>
                            <th className="px-3 py-2 border-b border-r border-gray-700 text-center w-auto" rowSpan={2}>CATEGORY</th>
                            <th className="px-3 py-2 border-b border-gray-700 text-center" colSpan={MONTHS.length}>MONTHLY CONTRIBUTIONS ({selectedPeriod})</th>
                            <th className="px-3 py-2 border-b border-gray-700 text-center w-auto" rowSpan={2}>TOTAL</th>
                        </tr>
                        <tr>
                            {MONTHS.map(month => (
                                <th key={month} className="px-3 py-2 border-b border-gray-700 text-center">{month.toUpperCase()}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((member) => {
                            const memberContrib = contributions[member.id];
                            if (!memberContrib) return null;

                            return (
                                <React.Fragment key={member.id}>
                                    <tr className="hover:bg-green-800/30">
                                        <td className="px-3 py-1 border-b border-r border-gray-700 font-semibold" rowSpan={2}>{member.name}</td>
                                        <td className="px-3 py-1 border-b border-r border-gray-700 text-yellow-400 font-bold">INVEST</td>
                                        {MONTHS.map(month => (
                                            <td key={`${member.id}-INVEST-${month}`} className="px-1 py-1 border-b border-gray-700">
                                                <input
                                                    type="number"
                                                    value={memberContrib.INVEST[month] || ""}
                                                    onChange={(e) => handleContributionChange(member.id, "INVEST", month, e.target.value)}
                                                    className="bg-transparent text-gray-200 w-full text-right p-0.5"
                                                />
                                            </td>
                                        ))}
                                        <td className="px-3 py-1 border-b border-gray-700 text-right font-bold text-yellow-400">
                                            {memberContrib.INVEST.TOTAL.toLocaleString('en-KE')}
                                        </td>
                                    </tr>

                                    <tr className="hover:bg-red-800/30">
                                        <td className="px-3 py-1 border-b border-r border-gray-700 text-red-400 font-bold">RISK</td>
                                        {MONTHS.map(month => (
                                            <td key={`${member.id}-RISK-${month}`} className="px-1 py-1 border-b border-gray-700">
                                                <input
                                                    type="number"
                                                    value={memberContrib.RISK[month] || ""}
                                                    onChange={(e) => handleContributionChange(member.id, "RISK", month, e.target.value)}
                                                    className="bg-transparent text-gray-200 w-full text-right p-0.5"
                                                />
                                            </td>
                                        ))}
                                        <td className="px-3 py-1 border-b border-gray-700 text-right font-bold text-red-400">
                                            {memberContrib.RISK.TOTAL.toLocaleString('en-KE')}
                                        </td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}

                        <tr className="bg-gray-900 text-white font-extrabold text-sm">
                            <td className="px-3 py-2 border-t border-gray-700" colSpan={2}>GRAND TOTALS</td>
                            {MONTHS.map(month => (
                                <td key={`total-${month}`} className="px-3 py-2 border-t border-gray-700 text-right">
                                    {columnTotals[month].toLocaleString('en-KE')}
                                </td>
                            ))}
                            <td className="px-3 py-2 border-t border-gray-700 text-right text-lg text-emerald-400">
                                {grandTotal.toLocaleString('en-KE')}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}

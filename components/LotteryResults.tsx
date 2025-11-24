
import React, { useState, useEffect } from 'react';
import { Customer, LotteryEntry, LotteryType, Settings, WinningEntryDetail } from '../types';

interface LotteryResultsProps {
    entries: LotteryEntry[];
    customers: Customer[];
    settings: Settings;
}

interface WinningNumbers {
    top3: string;
    bottom2: string;
    front3_1: string;
    front3_2: string;
    bottom3_1: string;
    bottom3_2: string;
    firstPrizeFull?: string; // Store full 6 digits for display
}

interface ExtendedWinningDetail extends WinningEntryDetail {
    usedRate: number;
}

interface HistoryResult extends WinningNumbers {
    date: string; // ISO Format YYYY-MM-DD
    apiId: string; // DDMMYYYY (BE)
    dateThai: string;
}

// --- Helpers ---

const apiIdToIso = (id: string): string => {
    // ID format is DDMMYYYY (Year is Buddhist Era)
    // e.g., 16112568 -> Day 16, Month 11, Year 2568
    if (!/^\d{8}$/.test(id)) return id;
    const day = id.substring(0, 2);
    const month = id.substring(2, 4);
    const yearBE = parseInt(id.substring(4, 8));
    const yearAD = yearBE - 543;
    return `${yearAD}-${month}-${day}`;
};

const isoToApiId = (iso: string): string => {
    // ISO format is YYYY-MM-DD
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const [y, m, d] = parts;
    const yearBE = parseInt(y) + 543;
    return `${d}${m}${yearBE}`;
};

const formatThaiDate = (iso: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const LotteryResults: React.FC<LotteryResultsProps> = ({ entries, customers, settings }) => {
    const [drawDate, setDrawDate] = useState(new Date().toISOString().split('T')[0]); // ISO String
    const [winningNumbers, setWinningNumbers] = useState<WinningNumbers>({
        top3: '',
        bottom2: '',
        front3_1: '',
        front3_2: '',
        bottom3_1: '',
        bottom3_2: '',
        firstPrizeFull: '',
    });
    const [results, setResults] = useState<ExtendedWinningDetail[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState('');
    
    // History State
    const [history, setHistory] = useState<HistoryResult[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numericValue = value.replace(/[^0-9]/g, '');
        setWinningNumbers(prev => ({ ...prev, [name]: numericValue }));
    };
    
    const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'N/A';

    // Core fetcher for a single date
    const fetchSingleResult = async (dateInput: string): Promise<HistoryResult | null> => {
        const isIdFormat = /^\d{8}$/.test(dateInput);
        const apiId = isIdFormat ? dateInput : isoToApiId(dateInput);
        const isoDate = isIdFormat ? apiIdToIso(dateInput) : dateInput;
        
        let result: HistoryResult | null = null;

        // Try RayRiffy API
        try {
            const response = await fetch(`https://lotto.api.rayriffy.com/lotto/${apiId}`);
            if (response.ok) {
                const data = await response.json();
                
                // Helper to safely get numbers from either prizes or runningNumbers
                const getNumbers = (key: string) => {
                    // Try prizes first (old structure)
                    const fromPrizes = data.response?.prizes?.find((p: any) => p.id === key);
                    if (fromPrizes) return fromPrizes.number;

                    // Try runningNumbers (new structure)
                    const fromRunning = data.response?.runningNumbers?.find((p: any) => p.id === key);
                    if (fromRunning) return fromRunning.number;

                    return [];
                };

                if (data?.response) {
                    const first = getNumbers('prizeFirst')?.[0] || '';
                    
                    // Retrieve all secondary prizes using new and old keys
                    const front3 = getNumbers('runningNumberFrontThree');
                    const last3 = getNumbers('runningNumberBackThree');
                    const last2 = getNumbers('runningNumberBackTwo');
                    
                    // Fallback keys
                    const front3Old = getNumbers('prizeFront3');
                    const last3Old = getNumbers('prizeLast3');
                    const last2Old = getNumbers('prizeLast2');

                    const finalFront3 = front3 && front3.length ? front3 : (front3Old || []);
                    const finalLast3 = last3 && last3.length ? last3 : (last3Old || []);
                    const finalLast2 = last2 && last2.length ? last2 : (last2Old || []);

                    result = {
                        date: isoDate,
                        apiId: apiId,
                        dateThai: formatThaiDate(isoDate),
                        firstPrizeFull: first,
                        top3: first.slice(-3),
                        bottom2: finalLast2?.[0] || '',
                        front3_1: finalFront3?.[0] || '',
                        front3_2: finalFront3?.[1] || '',
                        bottom3_1: finalLast3?.[0] || '',
                        bottom3_2: finalLast3?.[1] || '',
                    };
                }
            }
        } catch (e) {
            console.warn(`Fetch failed for ${apiId}`, e);
        }

        return result;
    };

    const loadData = async () => {
        setIsLoading(true);
        setLoadingHistory(true);
        setFetchError('');

        try {
            let allIds: string[] = [];
            let listFetchSuccess = false;

            // 1. Try Get List of Dates (IDs)
            try {
                const listRes = await fetch('https://lotto.api.rayriffy.com/list');
                if (listRes.ok) {
                    const listData = await listRes.json();
                    if(listData.response && Array.isArray(listData.response)) {
                         allIds = listData.response; // These are IDs like "16112568"
                         listFetchSuccess = true;
                    }
                }
            } catch (e) {
                 console.warn("Could not fetch date list:", e);
            }
            
            if (listFetchSuccess && allIds.length > 0) {
                const latestId = allIds[0];
                const latestIso = apiIdToIso(latestId);
                setDrawDate(latestIso); 
                
                // 2. Fetch Latest for Main Display
                const latestResult = await fetchSingleResult(latestId);
                if (latestResult) {
                    setWinningNumbers({
                        top3: latestResult.top3,
                        bottom2: latestResult.bottom2,
                        front3_1: latestResult.front3_1,
                        front3_2: latestResult.front3_2,
                        bottom3_1: latestResult.bottom3_1,
                        bottom3_2: latestResult.bottom3_2,
                        firstPrizeFull: latestResult.firstPrizeFull
                    });
                } else {
                    setFetchError('ไม่สามารถดึงข้อมูลรางวัลงวดล่าสุดได้');
                }

                // 3. Fetch History (Top 24 - Approx 12 Months)
                const historyIds = allIds.slice(0, 24);
                const results: HistoryResult[] = [];
                
                // Fetch in small batches to respect potential API limits
                const batchSize = 6;
                for (let i = 0; i < historyIds.length; i += batchSize) {
                    const batch = historyIds.slice(i, i + batchSize);
                    const batchResults = await Promise.all(batch.map(id => fetchSingleResult(id)));
                    results.push(...batchResults.filter((r): r is HistoryResult => r !== null));
                    // Small delay to be polite to the API
                    await new Promise(r => setTimeout(r, 50));
                }
                
                setHistory(results);
            } else {
                 // If list fails, just try to fetch using current drawDate state
                 const currentResult = await fetchSingleResult(drawDate);
                 if (currentResult) {
                    setWinningNumbers({
                        top3: currentResult.top3,
                        bottom2: currentResult.bottom2,
                        front3_1: currentResult.front3_1,
                        front3_2: currentResult.front3_2,
                        bottom3_1: currentResult.bottom3_1,
                        bottom3_2: currentResult.bottom3_2,
                        firstPrizeFull: currentResult.firstPrizeFull
                    });
                 }
            }

        } catch (error: any) {
            console.error("Main load error:", error);
            setFetchError('โหลดข้อมูลล้มเหลว กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsLoading(false);
            setLoadingHistory(false);
        }
    };
    
    const getLotteryResult = async () => {
        setIsLoading(true);
        try {
            const result = await fetchSingleResult(drawDate);
            if (result) {
                 setWinningNumbers({
                    top3: result.top3,
                    bottom2: result.bottom2,
                    front3_1: result.front3_1,
                    front3_2: result.front3_2,
                    bottom3_1: result.bottom3_1,
                    bottom3_2: result.bottom3_2,
                    firstPrizeFull: result.firstPrizeFull
                });
                setFetchError('');
            } else {
                setFetchError('ไม่พบข้อมูลสำหรับวันที่ระบุ หรือ API มีปัญหา');
            }
        } catch (e) {
            setFetchError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-fetch on mount
    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkWinners = () => {
        const relevantEntries = entries.filter(entry => entry.drawDate === drawDate);
        const winners: ExtendedWinningDetail[] = [];
        
        // Prepare numbers for comparison
        const top3 = winningNumbers.top3;
        const top2 = top3.slice(-2);
        const sortedTop3 = top3.split('').sort().join('');

        for (const entry of relevantEntries) {
            let isWinner = false;
            switch(entry.type) {
                case LotteryType.TOP_3:
                    if (entry.number === top3) isWinner = true;
                    break;
                case LotteryType.TOD_3:
                    const sortedEntryNum = entry.number.split('').sort().join('');
                    if (sortedEntryNum === sortedTop3 && top3.length === 3) isWinner = true;
                    break;
                case LotteryType.FRONT_3:
                    if (entry.number === winningNumbers.front3_1 || entry.number === winningNumbers.front3_2) isWinner = true;
                    break;
                case LotteryType.BOTTOM_3:
                     if (entry.number === winningNumbers.bottom3_1 || entry.number === winningNumbers.bottom3_2) isWinner = true;
                    break;
                case LotteryType.TOP_2:
                    if (entry.number === top2 && top3.length === 3) isWinner = true;
                    break;
                case LotteryType.BOTTOM_2:
                    if (entry.number === winningNumbers.bottom2) isWinner = true;
                    break;
                case LotteryType.RUN_TOP:
                    if (top3.includes(entry.number)) isWinner = true;
                    break;
                case LotteryType.RUN_BOTTOM:
                    if (winningNumbers.bottom2.includes(entry.number)) isWinner = true;
                    break;
            }
            
            if (isWinner) {
                const rate = entry.payoutRate || settings.payoutRates[entry.type] || 0;
                winners.push({
                    customerName: getCustomerName(entry.customerId),
                    entry,
                    usedRate: rate,
                    prizeAmount: entry.amount * rate
                });
            }
        }
        setResults(winners);
    };
    
    const loadFromHistory = (item: HistoryResult) => {
        setDrawDate(item.date);
        setWinningNumbers({
            top3: item.top3,
            bottom2: item.bottom2,
            front3_1: item.front3_1,
            front3_2: item.front3_2,
            bottom3_1: item.bottom3_1,
            bottom3_2: item.bottom3_2,
            firstPrizeFull: item.firstPrizeFull
        });
        setResults(null); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const totalPayout = results ? results.reduce((sum, winner) => sum + winner.prizeAmount, 0) : 0;

    return (
        <div className="p-4 space-y-8">
            {/* Header & Main Control */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">ตรวจผลรางวัล</h1>
                <div className="flex space-x-2">
                    <button 
                        onClick={getLotteryResult}
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center space-x-2 disabled:opacity-50 shadow-sm"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        )}
                        <span>ดึงผลล่าสุด</span>
                    </button>
                </div>
            </div>
            
            {fetchError && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm flex items-center animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {fetchError}
                </div>
            )}

            {/* Input Section */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md space-y-6 border border-slate-100 dark:border-slate-700">
                <div className="flex flex-col md:flex-row items-end md:items-center gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <div className="w-full md:w-auto flex-grow">
                        <label htmlFor="draw-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">งวดวันที่</label>
                        <input type="date" id="draw-date" value={drawDate} onChange={(e) => setDrawDate(e.target.value)} className="block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm" />
                    </div>
                </div>
                
                <div className="space-y-6">
                    {/* Main Prizes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-700 dark:to-slate-800 p-6 rounded-xl text-center shadow-sm border border-amber-200 dark:border-slate-600 relative overflow-hidden">
                            <label htmlFor="top3" className="block text-lg font-bold text-amber-800 dark:text-amber-400 mb-2">รางวัลที่ 1 (ใช้ 3 ตัวท้าย)</label>
                             {winningNumbers.firstPrizeFull && winningNumbers.firstPrizeFull.length > 3 && (
                                <div className="text-amber-600/50 dark:text-amber-400/30 text-sm font-mono tracking-widest mb-1">
                                    {winningNumbers.firstPrizeFull.slice(0, -3)}<span className="opacity-0">000</span>
                                </div>
                            )}
                            <input 
                                id="top3"
                                type="text" 
                                name="top3" 
                                value={winningNumbers.top3} 
                                onChange={handleInputChange} 
                                maxLength={3}
                                placeholder="000"
                                className="w-full text-center font-bold text-5xl tracking-[0.2em] p-4 border-none bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-0"
                            />
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.699-3.181a1 1 0 011.827 1.035L17.474 8l2.027 1.682a1 1 0 010 1.526l-2.027 1.682 1.006 4.241a1 1 0 01-1.827 1.035L15 14.901 11.046 16.483V17.8a1 1 0 01-2 0V16.48l-3.954-1.582-1.699 3.181a1 1 0 01-1.827-1.035L2.526 12 0.499 10.318a1 1 0 010-1.526L2.526 7.11 1.52 2.869a1 1 0 011.827-1.035L5.046 5.019 9 3.436V3a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700 dark:to-slate-800 p-6 rounded-xl text-center shadow-sm border border-blue-200 dark:border-slate-600 relative overflow-hidden">
                            <label htmlFor="bottom2" className="block text-lg font-bold text-blue-800 dark:text-blue-400 mb-3">เลขท้าย 2 ตัว</label>
                            <input 
                                id="bottom2"
                                type="text" 
                                name="bottom2" 
                                value={winningNumbers.bottom2} 
                                onChange={handleInputChange} 
                                maxLength={2}
                                placeholder="00"
                                className="w-full text-center font-bold text-5xl tracking-[0.2em] p-4 border-none bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-0"
                            />
                             <div className="absolute top-0 right-0 p-2 opacity-10">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Prizes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-xl border border-slate-100 dark:border-slate-700">
                            <label className="block text-md font-semibold text-slate-700 dark:text-slate-300 mb-3 text-center">3 ตัวหน้า (2 รางวัล)</label>
                            <div className="flex justify-center gap-4">
                                <input 
                                    type="text" 
                                    name="front3_1" 
                                    placeholder="000" 
                                    value={winningNumbers.front3_1} 
                                    onChange={handleInputChange} 
                                    maxLength={3}
                                    className="w-1/2 text-center text-2xl font-bold tracking-widest p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm"
                                />
                                <input 
                                    type="text" 
                                    name="front3_2" 
                                    placeholder="000" 
                                    value={winningNumbers.front3_2} 
                                    onChange={handleInputChange} 
                                    maxLength={3}
                                    className="w-1/2 text-center text-2xl font-bold tracking-widest p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm"
                                />
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-xl border border-slate-100 dark:border-slate-700">
                             <label className="block text-md font-semibold text-slate-700 dark:text-slate-300 mb-3 text-center">3 ตัวล่าง (2 รางวัล)</label>
                            <div className="flex justify-center gap-4">
                                <input 
                                    type="text" 
                                    name="bottom3_1" 
                                    placeholder="000" 
                                    value={winningNumbers.bottom3_1} 
                                    onChange={handleInputChange} 
                                    maxLength={3}
                                    className="w-1/2 text-center text-2xl font-bold tracking-widest p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm"
                                />
                                <input 
                                    type="text" 
                                    name="bottom3_2" 
                                    placeholder="000" 
                                    value={winningNumbers.bottom3_2} 
                                    onChange={handleInputChange} 
                                    maxLength={3}
                                    className="w-1/2 text-center text-2xl font-bold tracking-widest p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={checkWinners} 
                    className="w-full bg-primary hover:bg-primary-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md hover:shadow-lg text-lg flex items-center justify-center space-x-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    <span>คำนวณรางวัล (ตรวจสอบยอดจ่าย)</span>
                </button>
            </div>
            
            {/* Calculation Results */}
            {results && (
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border-t-4 border-emerald-500 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">ผลการตรวจสอบ</h2>
                        <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                            ยอดจ่ายสุทธิ: {totalPayout.toLocaleString()} ฿
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-sm text-slate-600 dark:text-slate-400 mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        พบผู้ถูกรางวัล {results.length} รายการ จากทั้งหมด {entries.filter(e => e.drawDate === drawDate).length} รายการ
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                        {results.length > 0 ? (
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-900 dark:text-slate-300">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 font-semibold">ลูกค้า</th>
                                        <th scope="col" className="px-6 py-3 font-semibold">ประเภท</th>
                                        <th scope="col" className="px-6 py-3 font-semibold text-center">เลขที่ซื้อ</th>
                                        <th scope="col" className="px-6 py-3 font-semibold text-right">จำนวนเงิน</th>
                                        <th scope="col" className="px-6 py-3 font-semibold text-right">เรทจ่าย</th>
                                        <th scope="col" className="px-6 py-3 font-semibold text-right text-emerald-600 dark:text-emerald-400">ยอดที่ถูก</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((r, index) => (
                                        <tr key={index} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{r.customerName}</td>
                                            <td className="px-6 py-4">{r.entry.type}</td>
                                            <td className="px-6 py-4 text-center font-mono font-bold tracking-wider">{r.entry.number}</td>
                                            <td className="px-6 py-4 text-right text-slate-500">{r.entry.amount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-slate-400">{r.usedRate}</td>
                                            <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{r.prizeAmount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                ไม่พบรายการที่ถูกรางวัล
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* History Table Section */}
            <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">สถิติผลสลากกินแบ่งรัฐบาล ย้อนหลัง 12 เดือน</h2>
                
                {loadingHistory && history.length === 0 ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-900 dark:text-slate-300">
                                <tr>
                                    <th scope="col" className="px-4 py-3 whitespace-nowrap">งวดวันที่</th>
                                    <th scope="col" className="px-4 py-3 text-center">รางวัลที่ 1</th>
                                    <th scope="col" className="px-4 py-3 text-center">เลขหน้า 3 ตัว</th>
                                    <th scope="col" className="px-4 py-3 text-center">เลขท้าย 3 ตัว</th>
                                    <th scope="col" className="px-4 py-3 text-center">เลขท้าย 2 ตัว</th>
                                    <th scope="col" className="px-4 py-3 text-center">ตรวจทาน</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((item, idx) => (
                                    <tr key={idx} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900 dark:text-white">
                                            {item.dateThai}
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                                            {item.firstPrizeFull || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex flex-col sm:flex-row justify-center sm:space-x-2">
                                                <span>{item.front3_1 || '-'}</span>
                                                <span className="hidden sm:inline">|</span>
                                                <span>{item.front3_2 || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex flex-col sm:flex-row justify-center sm:space-x-2">
                                                <span>{item.bottom3_1 || '-'}</span>
                                                <span className="hidden sm:inline">|</span>
                                                <span>{item.bottom3_2 || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400 text-lg">
                                            {item.bottom2 || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button 
                                                onClick={() => loadFromHistory(item)}
                                                className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-slate-700 dark:text-indigo-300 dark:hover:bg-slate-600 px-3 py-1.5 rounded border border-indigo-200 dark:border-slate-600 font-medium"
                                            >
                                                ตรวจทาน
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

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
    date: string;
    dateThai: string;
}

export const LotteryResults: React.FC<LotteryResultsProps> = ({ entries, customers, settings }) => {
    const [drawDate, setDrawDate] = useState(new Date().toISOString().split('T')[0]);
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

    // Helper to format date for GLO API (dd/mm/yyyy - BE)
    const toGloDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-');
        const buddhistYear = parseInt(y) + 543;
        return `${d}/${m}/${buddhistYear}`;
    };

    // Helper to format date for Display (Thai)
    const toThaiDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Core fetcher for a single date
    const fetchSingleResult = async (dateStr: string): Promise<HistoryResult | null> => {
        const gloDate = toGloDate(dateStr);
        let result: HistoryResult | null = null;

        // 1. Try GLO API
        try {
            const response = await fetch("https://www.glo.or.th/api/checking/getLotteryResult", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: gloDate })
            });

            if (response.ok) {
                const data = await response.json();
                if (data?.status === 'success' && data?.response?.data) {
                    const d = data.response.data;
                    const firstPrize = d.first?.number?.[0] || '';
                    result = {
                        date: dateStr,
                        dateThai: toThaiDate(dateStr),
                        firstPrizeFull: firstPrize,
                        top3: firstPrize.slice(-3),
                        bottom2: d.last2?.number?.[0] || '',
                        front3_1: d.last3f?.number?.[0] || '',
                        front3_2: d.last3f?.number?.[1] || '',
                        bottom3_1: d.last3b?.number?.[0] || '',
                        bottom3_2: d.last3b?.number?.[1] || '',
                    };
                }
            }
        } catch (e) {
            // GLO failed, proceed to fallback
            console.warn(`GLO fetch failed for ${dateStr}`, e);
        }

        if (result) return result;

        // 2. Try Fallback API (RayRiffy)
        try {
            const response = await fetch(`https://lotto.api.rayriffy.com/lotto/${dateStr}`);
            if (response.ok) {
                const data = await response.json();
                if (data?.response?.prizes) {
                    const p = data.response.prizes;
                    const getPrize = (id: string) => p.find((x: any) => x.id === id);
                    const first = getPrize('prizeFirst')?.number?.[0] || '';
                    const front3 = getPrize('prizeFront3')?.number || [];
                    const last3 = getPrize('prizeLast3')?.number || [];
                    
                    result = {
                        date: dateStr,
                        dateThai: toThaiDate(dateStr),
                        firstPrizeFull: first,
                        top3: first.slice(-3),
                        bottom2: getPrize('prizeLast2')?.number?.[0] || '',
                        front3_1: front3[0] || '',
                        front3_2: front3[1] || '',
                        bottom3_1: last3[0] || '',
                        bottom3_2: last3[1] || '',
                    };
                }
            }
        } catch (e) {
            console.warn(`Fallback fetch failed for ${dateStr}`, e);
        }

        return result;
    };

    const loadData = async () => {
        setIsLoading(true);
        setLoadingHistory(true);
        setFetchError('');

        try {
            let allDates: string[] = [];
            let listFetchSuccess = false;

            // 1. Try Get List of Dates
            try {
                const listRes = await fetch('https://lotto.api.rayriffy.com/list');
                if (listRes.ok) {
                    const listData = await listRes.json();
                    if(listData.response && Array.isArray(listData.response)) {
                         allDates = listData.response; 
                         listFetchSuccess = true;
                    }
                }
            } catch (e) {
                 console.warn("Could not fetch date list:", e);
            }
            
            if (listFetchSuccess && allDates.length > 0) {
                // 2. Fetch Latest for Main Display
                const latestDate = allDates[0];
                setDrawDate(latestDate); 
                
                const latestResult = await fetchSingleResult(latestDate);
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

                // 3. Fetch History (Top 10)
                const historyDates = allDates.slice(0, 10);
                const historyPromises = historyDates.map(d => fetchSingleResult(d));
                const historyResults = await Promise.all(historyPromises);
                
                setHistory(historyResults.filter((r): r is HistoryResult => r !== null));
            } else {
                 // If list fails, just try to fetch strictly for the currently selected date (today default)
                 // This allows the page to load even if the history list API is down
                 console.log("Fetching list failed, trying fallback for current date");
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
                 // We don't set a hard error here to allow user to manually input
            }

        } catch (error: any) {
            console.error("Main load error:", error);
            // Don't show a blocking error, just log it. 
            // setFetchError('โหลดข้อมูลล้มเหลว กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsLoading(false);
            setLoadingHistory(false);
        }
    };
    
    // Function exposed to button for manual refresh/fetch specific date
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
        setResults(null); // Reset calculation results when switching
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
                        <span>ดึงผล (GLO)</span>
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
                                            <td className="px-6 py-4 text-right text-slate-400">x{r.usedRate}</td>
                                            <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{r.prizeAmount.toLocaleString()} ฿</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p>ไม่พบผู้ถูกรางวัลในงวดนี้</p>
                            </div>
                        )}
                    </div>
                 </div>
            )}

            {/* Historical Results List (Bottom Section) */}
            <div className="mt-8">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ผลสลากกินแบ่งย้อนหลัง 10 งวด
                </h2>
                
                {loadingHistory ? (
                     <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md animate-pulse h-32"></div>
                        ))}
                     </div>
                ) : (
                    history.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {history.map((item, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-shadow">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div className="flex flex-col items-center md:items-start min-w-[150px]">
                                            <span className="text-sm text-slate-500 dark:text-slate-400">งวดวันที่</span>
                                            <span className="text-lg font-bold text-slate-800 dark:text-white">{item.dateThai}</span>
                                            <button 
                                                onClick={() => loadFromHistory(item)}
                                                className="mt-2 text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 rounded-full font-medium transition-colors"
                                            >
                                                นำไปตรวจ
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                            <div className="flex flex-col items-center p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-800/30">
                                                <span className="text-xs text-amber-600 dark:text-amber-400 mb-1">รางวัลที่ 1</span>
                                                <span className="font-bold text-xl text-amber-800 dark:text-amber-300">{item.firstPrizeFull || item.top3}</span>
                                            </div>
                                            <div className="flex flex-col items-center p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                                <span className="text-xs text-blue-600 dark:text-blue-400 mb-1">เลขท้าย 2 ตัว</span>
                                                <span className="font-bold text-xl text-blue-800 dark:text-blue-300">{item.bottom2}</span>
                                            </div>
                                            <div className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                                <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">เลขหน้า 3 ตัว</span>
                                                <div className="flex space-x-2 font-medium text-slate-700 dark:text-slate-200">
                                                    <span>{item.front3_1}</span>
                                                    <span className="text-slate-300">|</span>
                                                    <span>{item.front3_2}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                                <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">เลขท้าย 3 ตัว</span>
                                                <div className="flex space-x-2 font-medium text-slate-700 dark:text-slate-200">
                                                    <span>{item.bottom3_1}</span>
                                                    <span className="text-slate-300">|</span>
                                                    <span>{item.bottom3_2}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <p className="text-slate-500 dark:text-slate-400">ไม่สามารถโหลดข้อมูลย้อนหลังได้ กรุณาค้นหาตามวันที่ด้านบน</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};
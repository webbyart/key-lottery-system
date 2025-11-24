import React, { useState } from 'react';
import { Customer, LotteryEntry, LotteryType } from '../types';

interface LotteryEntryProps {
  customers: Customer[];
  entries: LotteryEntry[];
  addEntry: (entry: Omit<LotteryEntry, 'id' | 'createdAt'>) => void;
}

// Define the shape of a single entry row in the form
interface EntryRow {
  key: number; // For stable rendering
  type: LotteryType;
  number: string;
  amount: number | '';
}

export const LotteryEntryForm: React.FC<LotteryEntryProps> = ({ customers, entries, addEntry }) => {
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id || '');
  
  // State to hold the list of entry rows, starting with one empty row.
  const [entryRows, setEntryRows] = useState<EntryRow[]>([
    { key: Date.now(), type: LotteryType.TOP_2, number: '', amount: '' }
  ]);

  const handleAddRow = () => {
    setEntryRows([
      ...entryRows,
      // Add a new row with default values
      { key: Date.now(), type: LotteryType.TOP_2, number: '', amount: '' }
    ]);
  };
  
  const handleRemoveRow = (keyToRemove: number) => {
    // Prevent removing the very last row
    if (entryRows.length > 1) {
        setEntryRows(entryRows.filter(row => row.key !== keyToRemove));
    }
  };

  const handleRowChange = (keyToUpdate: number, field: keyof Omit<EntryRow, 'key'>, value: string | number) => {
    setEntryRows(entryRows.map(row => 
      row.key === keyToUpdate ? { ...row, [field]: value } : row
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let entriesAdded = 0;
    // Loop through each row and add it as a new entry if valid
    entryRows.forEach(row => {
      const amountNumber = Number(row.amount);
      if (customerId && row.number && !isNaN(amountNumber) && amountNumber > 0) {
        addEntry({
          customerId,
          type: row.type,
          number: row.number,
          amount: amountNumber,
          payoutRate: 90, // Example rate, ideally from settings
          drawDate: new Date().toISOString().split('T')[0],
        });
        entriesAdded++;
      }
    });

    // If any entries were successfully added, reset the form
    if (entriesAdded > 0) {
      setEntryRows([{ key: Date.now(), type: LotteryType.TOP_2, number: '', amount: '' }]);
    }
  };
  
  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'N/A';
  
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">คีย์หวย</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md space-y-4">
        <div>
          <label htmlFor="customer" className="block text-sm font-medium text-slate-700 dark:text-slate-300">ลูกค้า</label>
          <select 
            id="customer" 
            value={customerId} 
            onChange={(e) => setCustomerId(e.target.value)} 
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            >
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Dynamic Entry Rows */}
        <div className="space-y-3 pt-2">
            {/* Header for the input rows */}
            <div className="grid grid-cols-12 gap-2 px-1">
                <label className="col-span-5 sm:col-span-4 block text-xs font-medium text-slate-500 dark:text-slate-400">ประเภท</label>
                <label className="col-span-3 block text-xs font-medium text-slate-500 dark:text-slate-400">เลข</label>
                <label className="col-span-3 block text-xs font-medium text-slate-500 dark:text-slate-400">จำนวนเงิน</label>
            </div>
          {entryRows.map((row) => (
            <div key={row.key} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5 sm:col-span-4">
                <select 
                    value={row.type} 
                    onChange={(e) => handleRowChange(row.key, 'type', e.target.value as LotteryType)}
                    className="w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                >
                  {Object.values(LotteryType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-span-3">
                <input 
                    type="text" 
                    value={row.number} 
                    onChange={(e) => handleRowChange(row.key, 'number', e.target.value)} 
                    className="w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm" />
              </div>
              <div className="col-span-3">
                <input 
                    type="number" 
                    value={row.amount} 
                    onChange={(e) => handleRowChange(row.key, 'amount', e.target.value ? Number(e.target.value) : '')} 
                    className="w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm" />
              </div>
              <div className="col-span-1 flex items-center justify-end">
                <button 
                    type="button" 
                    onClick={() => handleRemoveRow(row.key)} 
                    disabled={entryRows.length <= 1}
                    className="p-2 text-slate-400 hover:text-red-500 disabled:text-slate-200 dark:disabled:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 disabled:hover:bg-transparent"
                    aria-label="Remove item"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <button 
            type="button" 
            onClick={handleAddRow} 
            className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 font-bold py-2 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors flex items-center justify-center space-x-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>เพิ่มรายการ</span>
        </button>

        <button type="submit" className="w-full bg-primary hover:bg-primary-600 text-white font-bold py-3 px-4 rounded-lg transition-colors text-base">
          บันทึกทั้งหมด
        </button>
      </form>
      
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
        <h2 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">รายการล่าสุด</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
              <tr>
                <th scope="col" className="px-6 py-3">ลูกค้า</th>
                <th scope="col" className="px-6 py-3">ประเภท</th>
                <th scope="col" className="px-6 py-3">เลข</th>
                <th scope="col" className="px-6 py-3 text-right">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(-5).reverse().map(entry => (
                <tr key={entry.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{getCustomerName(entry.customerId)}</td>
                  <td className="px-6 py-4">{entry.type}</td>
                  <td className="px-6 py-4">{entry.number}</td>
                  <td className="px-6 py-4 text-right">{entry.amount.toLocaleString()} ฿</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useRef } from 'react';
import { Customer, LotteryEntry, LotteryType, Settings } from '../types';

// --- BahtText Utility ---
const ThaiNumberToText = (amount: number): string => {
  if (isNaN(amount)) return '';
  const thaiNumbers = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  
  let bahtText = '';
  const numberStr = amount.toFixed(2).toString();
  const [integerPart, decimalPart] = numberStr.split('.');

  const convertToText = (numStr: string) => {
      let text = '';
      const len = numStr.length;
      for (let i = 0; i < len; i++) {
          const digit = parseInt(numStr.charAt(i));
          const unitIndex = len - i - 1;
          
          if (digit === 0) continue;

          if (digit === 1 && unitIndex === 0 && len > 1) {
              text += 'เอ็ด';
          } else if (digit === 2 && unitIndex === 1) {
              text += 'ยี่';
          } else if (digit === 1 && unitIndex === 1) {
              // Do nothing for 'Sib' (10)
          } else {
              text += thaiNumbers[digit];
          }

          text += units[unitIndex];
      }
      return text;
  };

  if (parseInt(integerPart) === 0) {
      bahtText += 'ศูนย์บาท';
  } else {
      // Handle millions separately if needed, but for simple bills max length is usually handled. 
      // Simplified for < 10 Million. For robustness > 1M requires looping, but let's assume standard lottery bills.
      if (integerPart.length > 7) {
           // Fallback or simple logic for > million
           bahtText += integerPart + ' บาท '; 
      } else {
          bahtText += convertToText(integerPart) + 'บาท';
      }
  }

  if (parseInt(decimalPart) === 0) {
      bahtText += 'ถ้วน';
  } else {
      bahtText += convertToText(decimalPart) + 'สตางค์';
  }

  return bahtText;
};

// --- Types ---
interface LotteryEntryProps {
  customers: Customer[];
  entries: LotteryEntry[];
  settings: Settings;
  onSaveEntries: (entries: Omit<LotteryEntry, 'id' | 'createdAt'>[]) => Promise<void>;
}

interface EntryRow {
  key: number;
  type: LotteryType;
  number: string;
  amount: number | '';
}

interface BillData {
    customerName: string;
    items: { type: string; number: string; amount: number }[];
    totalAmount: number;
    drawDate: string;
    timestamp: Date;
}

// --- Receipt Component (Visible only when printing) ---
const ReceiptSlip: React.FC<{ data: BillData | null }> = ({ data }) => {
    if (!data) return null;

    const formattedDate = data.timestamp.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const formattedTime = data.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const formattedDrawDate = new Date(data.drawDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div id="printable-slip" className="hidden print:block fixed inset-0 w-full h-full bg-white z-[9999] p-8 overflow-y-auto">
            <div className="max-w-md mx-auto text-black font-mono text-sm border p-4 border-gray-300 shadow-none print:border-none">
                <div className="text-center mb-4">
                    <h2 className="text-xl font-bold">บิลรายการซื้อหวย</h2>
                    <div className="border-b-2 border-dashed border-black my-2"></div>
                </div>

                <div className="mb-2 space-y-1">
                    <div className="flex justify-between">
                        <span>วันที่: {formattedDate}</span>
                        <span>เวลา: {formattedTime}</span>
                    </div>
                    <div>ลูกค้า: <span className="font-bold">{data.customerName}</span></div>
                    <div>งวดประจำวันที่: <span className="font-bold">{formattedDrawDate}</span></div>
                </div>

                <div className="border-b border-black my-2"></div>

                <table className="w-full mb-4">
                    <thead>
                        <tr className="text-left">
                            <th className="pb-1">รายการ</th>
                            <th className="pb-1 text-center">เลข</th>
                            <th className="pb-1 text-right">เงิน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((item, idx) => (
                            <tr key={idx}>
                                <td className="py-0.5 text-xs">{item.type}</td>
                                <td className="py-0.5 text-center font-bold text-lg">{item.number}</td>
                                <td className="py-0.5 text-right">{item.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="border-t border-black my-2"></div>

                <div className="flex justify-between items-end mb-2">
                    <span className="font-bold text-lg">รวมทั้งสิ้น</span>
                    <span className="font-bold text-xl">{data.totalAmount.toLocaleString()} บาท</span>
                </div>
                
                <div className="text-right text-xs mb-8 italic">
                    ({ThaiNumberToText(data.totalAmount)})
                </div>

                <div className="mt-12 grid grid-cols-2 gap-8">
                    <div className="text-center">
                        <div className="border-b border-black w-full h-8"></div>
                        <p className="mt-1 text-xs">ผู้รับเงิน</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-black w-full h-8"></div>
                        <p className="mt-1 text-xs">ผู้ซื้อ</p>
                    </div>
                </div>

                <div className="text-center mt-8 text-xs text-gray-500">
                    ขอบคุณที่ใช้บริการ
                </div>
            </div>
        </div>
    );
};


// --- Main Form Component ---
export const LotteryEntryForm: React.FC<LotteryEntryProps> = ({ customers, entries, onSaveEntries, settings }) => {
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entryRows, setEntryRows] = useState<EntryRow[]>([
    { key: Date.now(), type: LotteryType.TOP_2, number: '', amount: '' }
  ]);
  
  // State for printing
  const [lastBill, setLastBill] = useState<BillData | null>(null);

  const handleAddRow = () => {
    setEntryRows([
      ...entryRows,
      { key: Date.now(), type: LotteryType.TOP_2, number: '', amount: '' }
    ]);
  };
  
  const handleRemoveRow = (keyToRemove: number) => {
    if (entryRows.length > 1) {
        setEntryRows(entryRows.filter(row => row.key !== keyToRemove));
    }
  };

  const handleRowChange = (keyToUpdate: number, field: keyof Omit<EntryRow, 'key'>, value: string | number) => {
    setEntryRows(entryRows.map(row => 
      row.key === keyToUpdate ? { ...row, [field]: value } : row
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    
    setIsSubmitting(true);
    
    const validEntries: Omit<LotteryEntry, 'id' | 'createdAt'>[] = [];
    const drawDate = new Date().toISOString().split('T')[0];
    const billItems: { type: string; number: string; amount: number }[] = [];
    let total = 0;

    entryRows.forEach(row => {
      const amountNumber = Number(row.amount);
      if (row.number && !isNaN(amountNumber) && amountNumber > 0) {
        const entry = {
          customerId,
          type: row.type,
          number: row.number,
          amount: amountNumber,
          payoutRate: settings.payoutRates[row.type] || 0,
          drawDate: drawDate,
        };
        validEntries.push(entry);
        
        billItems.push({
            type: row.type,
            number: row.number,
            amount: amountNumber
        });
        total += amountNumber;
      }
    });

    if (validEntries.length > 0) {
        await onSaveEntries(validEntries);
        
        // Prepare data for printing
        const selectedCustomer = customers.find(c => c.id === customerId);
        setLastBill({
            customerName: selectedCustomer?.name || 'ลูกค้าทั่วไป',
            items: billItems,
            totalAmount: total,
            drawDate: drawDate,
            timestamp: new Date()
        });

        // Reset form
        setEntryRows([{ key: Date.now(), type: LotteryType.TOP_2, number: '', amount: '' }]);
    }
    
    setIsSubmitting(false);
  };
  
  const handlePrint = () => {
      window.print();
  };
  
  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'N/A';
  
  return (
    <div className="p-4 space-y-6">
      {/* Hide the main UI during printing */}
      <div className="print:hidden space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">คีย์หวย</h1>
            {lastBill && (
                <button 
                    onClick={handlePrint}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 shadow-sm animate-bounce-short"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                    </svg>
                    <span>พิมพ์บิลล่าสุด</span>
                </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md space-y-4">
            <div>
              <label htmlFor="customer" className="block text-sm font-medium text-slate-700 dark:text-slate-300">ลูกค้า</label>
              <select 
                id="customer" 
                value={customerId} 
                onChange={(e) => setCustomerId(e.target.value)} 
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                >
                {customers.length === 0 && <option value="">ไม่พบข้อมูลลูกค้า</option>}
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Dynamic Entry Rows */}
            <div className="space-y-3 pt-2">
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
                      {Object.values(LotteryType).map(t => <option key={t} value={t}>{t} (x{settings.payoutRates[t]})</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input 
                        type="text" 
                        value={row.number} 
                        onChange={(e) => handleRowChange(row.key, 'number', e.target.value)} 
                        className="w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm font-bold tracking-wider" />
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

            <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-600 disabled:bg-primary-300 text-white font-bold py-3 px-4 rounded-lg transition-colors text-base flex items-center justify-center"
            >
                {isSubmitting ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        กำลังบันทึก...
                    </>
                ) : 'บันทึกทั้งหมด'}
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
                    <th scope="col" className="px-6 py-3 text-right">เรทจ่าย</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(0, 5).map(entry => (
                    <tr key={entry.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{getCustomerName(entry.customerId)}</td>
                      <td className="px-6 py-4">{entry.type}</td>
                      <td className="px-6 py-4">{entry.number}</td>
                      <td className="px-6 py-4 text-right">{entry.amount.toLocaleString()} ฿</td>
                      <td className="px-6 py-4 text-right text-slate-400">{entry.payoutRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      </div>
      
      {/* Receipt Component (Rendered here, but only visible in print view via CSS) */}
      <ReceiptSlip data={lastBill} />
    </div>
  );
};

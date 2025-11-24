import React, { useState } from 'react';
import { Settings, LotteryType } from '../types';
import { supabase } from '../lib/supabase';

interface SettingsProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  onSave: (newSettings: Settings) => Promise<void>;
}

export const SettingsComponent: React.FC<SettingsProps> = ({ settings, setSettings, onSave }) => {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const toggleTheme = () => {
    setSettings(prev => ({...prev, theme: prev.theme === 'light' ? 'dark' : 'light'}));
  };

  const handleRateChange = (type: LotteryType, value: string) => {
    const rate = Number(value);
    if (!isNaN(rate)) {
      setSettings(prev => ({
        ...prev,
        payoutRates: {
          ...prev.payoutRates,
          [type]: rate,
        },
      }));
    }
  };

  const handleSave = async () => {
      setIsSaving(true);
      await onSave(settings);
      setIsSaving(false);
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    try {
        // Check settings table
        const { error } = await supabase.from('settings').select('count', { count: 'exact', head: true });
        // Check payout_rates table
        const { error: rateError } = await supabase.from('payout_rates').select('count', { count: 'exact', head: true });
        
        if (error || rateError) {
             // 42P01 is PostgreSQL code for "undefined_table"
            if (error?.code === '42P01' || rateError?.code === '42P01') {
                 setConnectionStatus('success'); // Connected but tables missing
                 setConnectionMessage('เชื่อมต่อ Supabase สำเร็จ (แต่ยังไม่ได้สร้างตารางครบ)');
            } else {
                 throw error || rateError;
            }
        } else {
            setConnectionStatus('success');
            setConnectionMessage('เชื่อมต่อฐานข้อมูลและตารางครบถ้วน พร้อมใช้งาน');
        }
    } catch (err: any) {
        setConnectionStatus('error');
        setConnectionMessage(`การเชื่อมต่อล้มเหลว: ${err.message}`);
    }
  };

  const sqlCode = `
-- 1. Create Customers Table
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Payout Rates Table (สำหรับการคำนวณค่าใช้จ่าย)
CREATE TABLE payout_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT UNIQUE NOT NULL,
    rate NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Payout Rates
INSERT INTO payout_rates (type, rate) VALUES
('3 ตัวบน', 900),
('3 ตัวล่าง', 450),
('3 ตัวหน้า', 450),
('3 ตัวโต๊ด', 150),
('2 ตัวบน', 90),
('2 ตัวล่าง', 90),
('วิ่งบน', 3.2),
('วิ่งล่าง', 4.2)
ON CONFLICT (type) DO UPDATE SET rate = EXCLUDED.rate;

-- 3. Create Lottery Entries Table
CREATE TABLE lottery_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    draw_date DATE NOT NULL,
    type TEXT NOT NULL,
    number TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    payout_rate NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Payments Table
CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    method TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Settings Table
CREATE TABLE settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    theme TEXT DEFAULT 'light',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (adjust strictly for production)
CREATE POLICY "Public Access Customers" ON customers FOR ALL USING (true);
CREATE POLICY "Public Access Entries" ON lottery_entries FOR ALL USING (true);
CREATE POLICY "Public Access Payments" ON payments FOR ALL USING (true);
CREATE POLICY "Public Access Payout Rates" ON payout_rates FOR ALL USING (true);
CREATE POLICY "Public Access Settings" ON settings FOR ALL USING (true);
`;

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">ตั้งค่า</h1>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-primary hover:bg-primary-600 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center shadow-lg disabled:opacity-70"
          >
              {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    บันทึก
                  </>
              ) : 'บันทึกการเปลี่ยนแปลง'}
          </button>
      </div>
      
      {/* Database Connection Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border-l-4 border-indigo-500">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">สถานะฐานข้อมูล</h2>
            <button 
                onClick={testConnection} 
                disabled={connectionStatus === 'testing'}
                className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1 rounded-full transition-colors"
            >
                {connectionStatus === 'testing' ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะ'}
            </button>
          </div>
          
          {connectionStatus === 'success' && (
             <p className="text-sm text-green-600 font-medium">{connectionMessage}</p>
          )}
          {connectionStatus === 'error' && (
             <p className="text-sm text-red-600 font-medium">{connectionMessage}</p>
          )}

          <div className="mt-4">
               <details className="text-xs">
                   <summary className="cursor-pointer text-slate-500 hover:text-primary mb-2 font-medium">ดูโค้ด SQL สำหรับสร้างตาราง (รวมตารางราคาจ่าย)</summary>
                   <div className="relative mt-2">
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto h-64">
                        {sqlCode}
                    </pre>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(sqlCode);
                            alert('คัดลอก SQL เรียบร้อยแล้ว');
                        }}
                        className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white text-xs px-2 py-1 rounded"
                    >
                        Copy SQL
                    </button>
                   </div>
                   <p className="mt-2 text-slate-400">นำโค้ดนี้ไปรันใน SQL Editor ของ Supabase เพื่อสร้างตารางทั้งหมด</p>
               </details>
          </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">ธีม</h2>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-300">โหมดมืด</span>
          <button onClick={toggleTheme} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${settings.theme === 'dark' ? 'bg-primary' : 'bg-slate-200'}`}>
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">ตั้งค่าราคาจ่าย (ใช้คำนวณรางวัล)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
              <tr>
                <th scope="col" className="px-6 py-3">ประเภทหวย</th>
                <th scope="col" className="px-6 py-3 text-right">ราคาจ่าย (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(settings.payoutRates).map(([type, rate]) => (
                <tr key={type} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {type}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end">
                      <span className="mr-2 text-slate-400 text-xs">จ่าย 1 :</span>
                      <input 
                        type="number" 
                        value={rate}
                        onChange={(e) => handleRateChange(type as LotteryType, e.target.value)}
                        className="w-24 text-right border border-slate-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm font-bold"
                      />
                      <span className="ml-2 text-slate-500 dark:text-slate-400">฿</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
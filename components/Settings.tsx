import React, { useEffect, useState } from 'react';
import { Settings, LotteryType } from '../types';
import { supabase } from '../lib/supabase';

interface SettingsProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

export const SettingsComponent: React.FC<SettingsProps> = ({ settings, setSettings }) => {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');

  const toggleTheme = () => {
    setSettings(prev => ({...prev, theme: prev.theme === 'light' ? 'dark' : 'light'}));
  };
  
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const handleRateChange = (type: LotteryType, value: string) => {
    const rate = parseInt(value, 10);
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

  const testConnection = async () => {
    setConnectionStatus('testing');
    try {
        // Attempt to fetch from settings table first
        const { error } = await supabase.from('settings').select('count', { count: 'exact', head: true });
        
        if (error) {
            // Error code 42P01 means table undefined
            if (error.code === '42P01') {
                 setConnectionStatus('success');
                 setConnectionMessage('เชื่อมต่อ Supabase สำเร็จ (แต่ยังไม่ได้สร้างตาราง)');
            } else {
                 throw error;
            }
        } else {
            setConnectionStatus('success');
            setConnectionMessage('เชื่อมต่อฐานข้อมูลสำเร็จ พร้อมใช้งาน');
        }
    } catch (err: any) {
        setConnectionStatus('error');
        setConnectionMessage(`การเชื่อมต่อล้มเหลว: ${err.message}`);
    }
  };

  const sqlCode = `
-- Create Customers Table
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Lottery Entries Table
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

-- Create Payments Table
CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    method TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Payout Rates Table (New)
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

-- Create Settings Table
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
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">ตั้งค่า</h1>
      
      {/* Database Connection Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border-l-4 border-indigo-500">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">เชื่อมต่อฐานข้อมูล (Supabase)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Project URL: <span className="font-mono bg-slate-100 dark:bg-slate-900 px-1 rounded">https://fuiutzmkcwtuzjtbgfsg.supabase.co</span>
          </p>
          
          <div className="flex flex-col space-y-3">
              <button 
                onClick={testConnection} 
                disabled={connectionStatus === 'testing'}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                  {connectionStatus === 'testing' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>กำลังทดสอบ...</span>
                      </>
                  ) : (
                      <span>ทดสอบการเชื่อมต่อ</span>
                  )}
              </button>

              {connectionStatus === 'success' && (
                  <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      {connectionMessage}
                  </div>
              )}
              
              {connectionStatus === 'error' && (
                  <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      {connectionMessage}
                  </div>
              )}
          </div>

          <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">โค้ดสร้างตาราง (SQL)</label>
              <div className="text-xs text-slate-500 mb-2">นำโค้ดด้านล่างไปวางในเมนู SQL Editor ของ Supabase เพื่อสร้างตารางทั้งหมด</div>
              <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto h-40">
                      {sqlCode}
                  </pre>
                  <button 
                    onClick={() => navigator.clipboard.writeText(sqlCode)}
                    className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white text-xs px-2 py-1 rounded"
                  >
                      Copy
                  </button>
              </div>
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
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">ตั้งค่าราคาจ่าย</h2>
        <div className="space-y-4">
          {Object.entries(settings.payoutRates).map(([type, rate]) => (
            <div key={type} className="flex items-center justify-between">
              <label htmlFor={`rate-${type}`} className="text-slate-600 dark:text-slate-300">{type}</label>
              <input 
                id={`rate-${type}`}
                type="number" 
                value={rate}
                onChange={(e) => handleRateChange(type as LotteryType, e.target.value)}
                className="w-24 border border-slate-300 rounded-md shadow-sm py-1 px-2 text-right focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
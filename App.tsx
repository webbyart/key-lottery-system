import React, { useState, useEffect } from 'react';
import { Customer, LotteryEntry, Payment, Settings, View, LotteryType } from './types';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { LotteryEntryForm } from './components/LotteryEntry';
import { Customers } from './components/Customers';
import { Payments } from './components/Payments';
import { SettingsComponent } from './components/Settings';
import { Reports } from './components/Reports';
import { LotteryResults } from './components/LotteryResults';
import { supabase } from './lib/supabase';

const defaultSettings: Settings = {
  theme: 'light',
  payoutRates: {
    [LotteryType.TOP_3]: 900,
    [LotteryType.BOTTOM_3]: 450,
    [LotteryType.FRONT_3]: 450,
    [LotteryType.TOD_3]: 150,
    [LotteryType.TOP_2]: 90,
    [LotteryType.BOTTOM_2]: 90,
    [LotteryType.RUN_TOP]: 3.2,
    [LotteryType.RUN_BOTTOM]: 4.2,
  },
};

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<View>('DASHBOARD');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [entries, setEntries] = useState<LotteryEntry[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(false);

    // --- Data Fetching ---
    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Customers
            const { data: custData, error: custError } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: true });
            
            if (custError) throw custError;
            
            if (custData) {
                setCustomers(custData.map(c => ({
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    createdAt: c.created_at
                })));
            }

            // 2. Fetch Entries
            const { data: entryData, error: entryError } = await supabase
                .from('lottery_entries')
                .select('*')
                .order('created_at', { ascending: false });

            if (entryError) throw entryError;

            if (entryData) {
                setEntries(entryData.map(e => ({
                    id: e.id,
                    customerId: e.customer_id,
                    drawDate: e.draw_date,
                    type: e.type as LotteryType,
                    number: e.number,
                    amount: e.amount,
                    payoutRate: e.payout_rate,
                    createdAt: e.created_at
                })));
            }

            // 3. Fetch Payments
            const { data: payData, error: payError } = await supabase
                .from('payments')
                .select('*')
                .order('created_at', { ascending: false });

            if (payError) throw payError;

            if (payData) {
                setPayments(payData.map(p => ({
                    id: p.id,
                    customerId: p.customer_id,
                    amount: p.amount,
                    date: p.date,
                    method: p.method as any,
                })));
            }

            // 4. Fetch Settings & Payout Rates
            const { data: settingData } = await supabase.from('settings').select('*').limit(1).single();
            const { data: rateData } = await supabase.from('payout_rates').select('*');

            const newSettings = { ...defaultSettings };
            
            if (settingData) {
                newSettings.theme = settingData.theme === 'dark' ? 'dark' : 'light';
            }
            
            if (rateData && rateData.length > 0) {
                rateData.forEach(r => {
                    if (r.type && r.rate) {
                        newSettings.payoutRates[r.type as LotteryType] = Number(r.rate);
                    }
                });
            }
            setSettings(newSettings);

        } catch (error) {
            console.error("Error fetching data:", error);
            // Optionally handle error UI here
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Apply theme
    useEffect(() => {
        if (settings.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [settings.theme]);


    // --- Actions ---

    const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
        try {
            const { data, error } = await supabase
                .from('customers')
                .insert([{ name: customer.name, phone: customer.phone }])
                .select()
                .single();
            
            if (error) throw error;
            if (data) {
                setCustomers(prev => [...prev, {
                    id: data.id,
                    name: data.name,
                    phone: data.phone,
                    createdAt: data.created_at
                }]);
            }
        } catch (error) {
            console.error("Error adding customer:", error);
            alert("เกิดข้อผิดพลาดในการเพิ่มลูกค้า");
        }
    };

    const addEntriesBatch = async (newEntries: Omit<LotteryEntry, 'id' | 'createdAt'>[]) => {
        try {
            const dbEntries = newEntries.map(e => ({
                customer_id: e.customerId,
                draw_date: e.drawDate,
                type: e.type,
                number: e.number,
                amount: e.amount,
                payout_rate: e.payoutRate
            }));

            const { data, error } = await supabase
                .from('lottery_entries')
                .insert(dbEntries)
                .select();

            if (error) throw error;

            if (data) {
                const mappedEntries = data.map(e => ({
                    id: e.id,
                    customerId: e.customer_id,
                    drawDate: e.draw_date,
                    type: e.type as LotteryType,
                    number: e.number,
                    amount: e.amount,
                    payoutRate: e.payout_rate,
                    createdAt: e.created_at
                }));
                setEntries(prev => [...prev, ...mappedEntries]);
                alert("บันทึกรายการเรียบร้อยแล้ว");
            }
        } catch (error) {
            console.error("Error adding entries:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกรายการ");
        }
    };

    const addPayment = async (payment: Omit<Payment, 'id'>) => {
        try {
            const { data, error } = await supabase
                .from('payments')
                .insert([{
                    customer_id: payment.customerId,
                    amount: payment.amount,
                    date: payment.date,
                    method: payment.method
                }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setPayments(prev => [...prev, {
                    id: data.id,
                    customerId: data.customer_id,
                    amount: data.amount,
                    date: data.date,
                    method: data.method as any
                }]);
            }
        } catch (error) {
            console.error("Error adding payment:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกการชำระเงิน");
        }
    };

    const saveSettings = async (newSettings: Settings) => {
        try {
            // 1. Update Theme (in settings table)
            // We assume there is only one row for settings or we upsert.
            // First check if a row exists
            const { data: existingSettings } = await supabase.from('settings').select('id').limit(1);
            
            if (existingSettings && existingSettings.length > 0) {
                await supabase.from('settings').update({ theme: newSettings.theme }).eq('id', existingSettings[0].id);
            } else {
                await supabase.from('settings').insert({ theme: newSettings.theme });
            }

            // 2. Update Payout Rates (upsert each)
            const ratesToUpsert = Object.entries(newSettings.payoutRates).map(([type, rate]) => ({
                type,
                rate
            }));

            const { error: rateError } = await supabase
                .from('payout_rates')
                .upsert(ratesToUpsert, { onConflict: 'type' });

            if (rateError) throw rateError;

            setSettings(newSettings);
            alert("บันทึกการตั้งค่าเรียบร้อยแล้ว");

        } catch (error) {
            console.error("Error saving settings:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกการตั้งค่า");
        }
    };

    const renderView = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            );
        }

        switch (activeView) {
            case 'DASHBOARD':
                return <Dashboard entries={entries} customers={customers} />;
            case 'ENTRY':
                return (
                    <LotteryEntryForm 
                        customers={customers} 
                        entries={entries} 
                        onSaveEntries={addEntriesBatch} 
                        settings={settings}
                    />
                );
            case 'CUSTOMERS':
                return <Customers customers={customers} entries={entries} payments={payments} addCustomer={addCustomer} />;
            case 'PAYMENTS':
                return <Payments customers={customers} entries={entries} payments={payments} addPayment={addPayment} />;
            case 'REPORTS':
                return <Reports />;
            case 'RESULTS':
                return <LotteryResults entries={entries} customers={customers} settings={settings} />;
            case 'SETTINGS':
                return <SettingsComponent settings={settings} setSettings={setSettings} onSave={saveSettings} />;
            default:
                return <Dashboard entries={entries} customers={customers} />;
        }
    };

    return (
        <div className={`min-h-screen font-sans bg-slate-50 dark:bg-slate-900 ${settings.theme}`}>
            <main className="pb-20">
                {renderView()}
            </main>
            <BottomNav activeView={activeView} setActiveView={setActiveView} />
        </div>
    );
};

export default App;
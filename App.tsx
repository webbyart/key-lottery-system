import React from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Customer, LotteryEntry, Payment, Settings, View, LotteryType } from './types';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { LotteryEntryForm } from './components/LotteryEntry';
import { Customers } from './components/Customers';
import { Payments } from './components/Payments';
import { SettingsComponent } from './components/Settings';
import { Reports } from './components/Reports';
import { LotteryResults } from './components/LotteryResults';

// --- MOCK DATA ---
const createMockCustomers = (): Customer[] => [
    { id: 'c1', name: 'สมชาย ใจดี', phone: '081-234-5678', createdAt: new Date().toISOString() },
    { id: 'c2', name: 'สมศรี มีสุข', phone: '082-345-6789', createdAt: new Date().toISOString() },
    { id: 'c3', name: 'มานะ อดทน', phone: '083-456-7890', createdAt: new Date().toISOString() },
];

const createMockEntries = (): LotteryEntry[] => [
    { id: 'e1', customerId: 'c1', drawDate: new Date().toISOString().split('T')[0], type: LotteryType.TOP_3, number: '123', amount: 100, payoutRate: 500, createdAt: new Date().toISOString() },
    { id: 'e2', customerId: 'c1', drawDate: new Date().toISOString().split('T')[0], type: LotteryType.BOTTOM_2, number: '45', amount: 50, payoutRate: 90, createdAt: new Date().toISOString() },
    { id: 'e3', customerId: 'c2', drawDate: new Date().toISOString().split('T')[0], type: LotteryType.TOP_2, number: '88', amount: 200, payoutRate: 90, createdAt: new Date().toISOString() },
    { id: 'e4', customerId: 'c3', drawDate: new Date().toISOString().split('T')[0], type: LotteryType.RUN_BOTTOM, number: '7', amount: 1000, payoutRate: 4, createdAt: new Date().toISOString() },
    { id: 'e5', customerId: 'c2', drawDate: new Date().toISOString().split('T')[0], type: LotteryType.TOD_3, number: '321', amount: 10, payoutRate: 100, createdAt: new Date().toISOString() },
];

const createMockPayments = (): Payment[] => [
    { id: 'p1', customerId: 'c1', amount: 100, date: '2023-10-16', method: 'TRANSFER' as any },
];

const defaultSettings: Settings = {
  theme: 'light',
  payoutRates: {
    [LotteryType.TOP_3]: 500,
    [LotteryType.BOTTOM_3]: 150,
    [LotteryType.FRONT_3]: 150,
    [LotteryType.TOD_3]: 100,
    [LotteryType.TOP_2]: 90,
    [LotteryType.BOTTOM_2]: 90,
    [LotteryType.RUN_TOP]: 3,
    [LotteryType.RUN_BOTTOM]: 4,
  },
};


const App: React.FC = () => {
    const [activeView, setActiveView] = useLocalStorage<View>('activeView', 'DASHBOARD');
    const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', createMockCustomers());
    const [entries, setEntries] = useLocalStorage<LotteryEntry[]>('entries', createMockEntries());
    const [payments, setPayments] = useLocalStorage<Payment[]>('payments', createMockPayments());
    const [settings, setSettings] = useLocalStorage<Settings>('settings', defaultSettings);

    const addEntry = (entry: Omit<LotteryEntry, 'id' | 'createdAt'>) => {
        setEntries(prev => [...prev, { ...entry, id: `e${Date.now()}`, createdAt: new Date().toISOString() }]);
    };
    
    const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>) => {
        setCustomers(prev => [...prev, { ...customer, id: `c${Date.now()}`, createdAt: new Date().toISOString() }]);
    };
    
    const addPayment = (payment: Omit<Payment, 'id'>) => {
        setPayments(prev => [...prev, { ...payment, id: `p${Date.now()}` }]);
    };

    const renderView = () => {
        switch (activeView) {
            case 'DASHBOARD':
                return <Dashboard entries={entries} customers={customers} />;
            case 'ENTRY':
                return <LotteryEntryForm customers={customers} entries={entries} addEntry={addEntry} />;
            case 'CUSTOMERS':
                return <Customers customers={customers} entries={entries} payments={payments} addCustomer={addCustomer} />;
            case 'PAYMENTS':
                return <Payments customers={customers} entries={entries} payments={payments} addPayment={addPayment} />;
            case 'REPORTS':
                return <Reports />;
            case 'RESULTS':
                return <LotteryResults entries={entries} customers={customers} settings={settings} />;
            case 'SETTINGS':
                return <SettingsComponent settings={settings} setSettings={setSettings} />;
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

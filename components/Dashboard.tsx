import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Customer, LotteryEntry } from '../types';
import { Card } from './ui/Card';

const ChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const MoneyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1h4v1m-4 0a3 3 0 01-3-3h-1a4 4 0 014-4h2a4 4 0 014 4h-1a3 3 0 01-3 3m0 0h-1v1h1m0 0a3 3 0 00-3 3h-1a4 4 0 004 4h2a4 4 0 004-4h-1a3 3 0 00-3-3m0 0h-1v1h1" /></svg>;
const ProfitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const UserGroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.184-1.268-.5-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.184-1.268.5-1.857m0 0a5.002 5.002 0 019 0m-9 0a5.002 5.002 0 00-9 0m9 0c0-2.21 1.79-4 4-4s4 1.79 4 4m-8 0c0-2.21-1.79-4-4-4s-4 1.79-4 4" /></svg>;


interface DashboardProps {
  entries: LotteryEntry[];
  customers: Customer[];
}

export const Dashboard: React.FC<DashboardProps> = ({ entries, customers }) => {
    // FIX: Add explicit type `number` to the accumulator `sum` to avoid type inference issues.
    const totalSales = entries.reduce((sum: number, entry) => sum + entry.amount, 0);
    // Dummy calculation for profit
    const netProfit = totalSales * 0.15;

    // FIX: The initial value for reduce must be explicitly typed, otherwise TypeScript infers `{}`,
    // which does not have an index signature and causes downstream errors.
    const salesByDay = entries.reduce((acc: Record<string, number>, entry) => {
        const date = new Date(entry.drawDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
        if (!acc[date]) {
            acc[date] = 0;
        }
        acc[date] += entry.amount;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(salesByDay).map(([name, sales]) => ({ name, sales })).slice(-7);

    // FIX: The initial value for reduce must be explicitly typed. Otherwise, TypeScript
    // infers an incorrect type for `customerSales`, causing a type error in the `.sort()` call.
    const customerSales = entries.reduce((acc: Record<string, number>, entry) => {
        if (!acc[entry.customerId]) {
            acc[entry.customerId] = 0;
        }
        acc[entry.customerId] += entry.amount;
        return acc;
    }, {} as Record<string, number>);

    const topCustomers = Object.entries(customerSales)
        // FIX: Replaced destructuring in sort arguments to prevent type inference issues.
        // The values are now accessed by index, ensuring they are treated as numbers for the arithmetic operation.
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5)
        .map(([customerId, total]) => {
            const customer = customers.find(c => c.id === customerId);
            return { name: customer?.name || 'Unknown', total };
        });

    return (
        <div className="p-4 space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">ภาพรวมระบบ</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card title="ยอดขายรวม (งวดนี้)" value={`${totalSales.toLocaleString()} ฿`} icon={<MoneyIcon />} colorClass="bg-sky-500 text-white" />
                <Card title="กำไร-ขาดทุน (โดยประมาณ)" value={`${netProfit.toLocaleString()} ฿`} icon={<ProfitIcon />} colorClass="bg-emerald-500 text-white" />
                <Card title="ลูกค้าทั้งหมด" value={customers.length} icon={<UserGroupIcon />} colorClass="bg-amber-500 text-white" />
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
                <h2 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">ยอดขาย 7 วันล่าสุด</h2>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128, 128, 128, 0.2)" />
                            <XAxis dataKey="name" tick={{ fill: 'rgb(100 116 139)' }} />
                            <YAxis tick={{ fill: 'rgb(100 116 139)' }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    border: '1px solid #ccc',
                                    borderRadius: '8px',
                                }}
                                cursor={{fill: 'rgba(200, 200, 200, 0.1)'}}
                             />
                            <Bar dataKey="sales" fill="hsl(210, 80%, 55%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
                 <h2 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">Top 5 ลูกค้าที่มียอดซื้อสูงสุด</h2>
                 <ul className="space-y-3">
                     {topCustomers.map((customer, index) => (
                         <li key={index} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                             <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold">{customer.name.charAt(0)}</div>
                                <span className="font-medium text-slate-700 dark:text-slate-200">{customer.name}</span>
                             </div>
                             <span className="font-bold text-primary-600 dark:text-primary-400">{customer.total.toLocaleString()} ฿</span>
                         </li>
                     ))}
                 </ul>
            </div>
        </div>
    );
};

import React, { useState, useMemo } from 'react';
import { Customer, Payment, PaymentMethod, LotteryEntry } from '../types';

interface PaymentsProps {
  customers: Customer[];
  entries: LotteryEntry[];
  payments: Payment[];
  addPayment: (payment: Omit<Payment, 'id'>) => void;
}

export const Payments: React.FC<PaymentsProps> = ({ customers, entries, payments, addPayment }) => {
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id || '');
  const [amount, setAmount] = useState<number | ''>('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.TRANSFER);

  const customerBalances = useMemo(() => {
      const balances = new Map<string, number>();
      customers.forEach(c => {
          const totalPurchase = entries.filter(e => e.customerId === c.id).reduce((sum, e) => sum + e.amount, 0);
          const totalPaid = payments.filter(p => p.customerId === c.id).reduce((sum, p) => sum + p.amount, 0);
          balances.set(c.id, totalPurchase - totalPaid);
      });
      return balances;
  }, [customers, entries, payments]);

  const balanceDue = customerId ? customerBalances.get(customerId) || 0 : 0;
  
  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCustomerId = e.target.value;
      setCustomerId(newCustomerId);
      const newBalance = customerBalances.get(newCustomerId) || 0;
      setAmount(newBalance > 0 ? newBalance : '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerId && amount > 0) {
      addPayment({
        customerId,
        amount,
        method,
        date: new Date().toISOString().split('T')[0],
      });
      setAmount('');
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">ชำระเงิน</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md space-y-4">
        <div>
          <label htmlFor="customer" className="block text-sm font-medium text-slate-700 dark:text-slate-300">ลูกค้า</label>
          <select id="customer" value={customerId} onChange={handleCustomerChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md">
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        {customerId && (
            <div className="p-3 bg-primary-50 dark:bg-slate-700 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-300">ยอดที่ต้องชำระ:</p>
                <p className="text-xl font-bold text-primary dark:text-primary-400">{balanceDue.toLocaleString()} ฿</p>
            </div>
        )}

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300">ยอดที่จ่าย</label>
          <input type="number" id="amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm" />
        </div>

        <div>
          <label htmlFor="method" className="block text-sm font-medium text-slate-700 dark:text-slate-300">ช่องทาง</label>
          <select id="method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md">
            {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <button type="submit" className="w-full bg-primary hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          บันทึกการชำระเงิน
        </button>
      </form>
    </div>
  );
};

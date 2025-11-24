
import React, { useState, useMemo } from 'react';
import { Customer, LotteryEntry, Payment, PaymentStatus } from '../types';

interface CustomersProps {
  customers: Customer[];
  entries: LotteryEntry[];
  payments: Payment[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
}

const AddCustomerModal: React.FC<{onClose: () => void, onAdd: (customer: Omit<Customer, 'id' | 'createdAt'>) => void}> = ({ onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && phone) {
            onAdd({ name, phone });
            onClose();
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
                <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">เพิ่มลูกค้าใหม่</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อ-สกุล</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm"/>
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">เบอร์โทร</label>
                        <input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)} required className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm"/>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500">ยกเลิก</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-600">เพิ่มลูกค้า</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const Customers: React.FC<CustomersProps> = ({ customers, entries, payments, addCustomer }) => {
  const [showModal, setShowModal] = useState(false);

  const customerData = useMemo(() => {
    return customers.map(customer => {
      const customerEntries = entries.filter(e => e.customerId === customer.id);
      const customerPayments = payments.filter(p => p.customerId === customer.id);
      
      const totalPurchase = customerEntries.reduce((sum, e) => sum + e.amount, 0);
      const totalPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = totalPurchase - totalPaid;
      
      const status = balance <= 0 ? PaymentStatus.PAID : PaymentStatus.PENDING;
      
      return {
        ...customer,
        totalPurchase,
        balance,
        status,
      };
    });
  }, [customers, entries, payments]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">ลูกค้า</h1>
        <button onClick={() => setShowModal(true)} className="bg-primary hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            <span>เพิ่มลูกค้า</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
              <tr>
                <th scope="col" className="px-6 py-3">ชื่อ-สกุล</th>
                <th scope="col" className="px-6 py-3">เบอร์โทร</th>
                <th scope="col" className="px-6 py-3">ยอดค้างชำระ</th>
                <th scope="col" className="px-6 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {customerData.map(customer => (
                <tr key={customer.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{customer.name}</td>
                  <td className="px-6 py-4">{customer.phone}</td>
                  <td className="px-6 py-4">{customer.balance > 0 ? `${customer.balance.toLocaleString()} ฿` : '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      customer.status === PaymentStatus.PAID
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && <AddCustomerModal onClose={() => setShowModal(false)} onAdd={addCustomer} />}
    </div>
  );
};


import React from 'react';

export const Reports: React.FC = () => {
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">รายงานสรุปยอด</h1>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md space-y-4">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">ตัวกรอง</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="date-range" className="block text-sm font-medium text-slate-700 dark:text-slate-300">วันที่ / งวด</label>
              <input type="date" id="date-range" className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm" />
            </div>
            <div>
              <label htmlFor="customer-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300">ลูกค้า</label>
              <select id="customer-filter" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md">
                <option>ลูกค้าทั้งหมด</option>
              </select>
            </div>
            <div>
              <label htmlFor="type-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300">ประเภทเลข</label>
              <select id="type-filter" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md">
                <option>ทุกประเภท</option>
              </select>
            </div>
        </div>
        <div className="flex justify-end space-x-2 pt-2">
            <button className="bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg flex items-center space-x-2 hover:bg-slate-300 dark:hover:bg-slate-500">
                <span>Export Excel</span>
            </button>
            <button className="bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg flex items-center space-x-2 hover:bg-slate-300 dark:hover:bg-slate-500">
                <span>Export PDF</span>
            </button>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
        <p className="text-center text-slate-500 dark:text-slate-400">ส่วนแสดงผลรายงานจะปรากฏที่นี่</p>
      </div>
    </div>
  );
};

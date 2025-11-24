import React from 'react';
import { View } from '../types';

const HomeIcon = ({isActive}: {isActive: boolean}) => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>);
const DocumentAddIcon = ({isActive}: {isActive: boolean}) => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>);
const UsersIcon = ({isActive}: {isActive: boolean}) => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-1.78-4.125" /></svg>);
const CashIcon = ({isActive}: {isActive: boolean}) => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>);
const CogIcon = ({isActive}: {isActive: boolean}) => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const TrophyIcon = ({isActive}: {isActive: boolean}) => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" transform="translate(0 1)" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21h-2a2 2 0 01-2-2v-3a2 2 0 012-2h2v5zM5 21h2a2 2 0 002-2v-3a2 2 0 00-2-2H5v5z" transform="translate(0 -2)"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18v3m0-18v3" transform="translate(0 2)"/></svg>);


interface BottomNavProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

const navItems: { view: View; label: string; icon: React.FC<{isActive: boolean}> }[] = [
  { view: 'DASHBOARD', label: 'ภาพรวม', icon: HomeIcon },
  { view: 'ENTRY', label: 'คีย์หวย', icon: DocumentAddIcon },
  { view: 'CUSTOMERS', label: 'ลูกค้า', icon: UsersIcon },
  { view: 'PAYMENTS', label: 'ชำระเงิน', icon: CashIcon },
  { view: 'RESULTS', label: 'ผลหวย', icon: TrophyIcon },
  { view: 'SETTINGS', label: 'ตั้งค่า', icon: CogIcon },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeView, setActiveView }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-t-lg">
      <div className="grid h-full max-w-lg grid-cols-6 mx-auto">
        {navItems.map(({ view, label, icon: Icon }) => {
          const isActive = activeView === view;
          return (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              type="button"
              className={`inline-flex flex-col items-center justify-center font-medium px-2 hover:bg-slate-50 dark:hover:bg-slate-700 group transition-colors ${
                isActive ? 'text-primary dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon isActive={isActive} />
              <span className={`text-xs ${isActive ? 'font-bold' : ''}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
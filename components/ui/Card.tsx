
import React from 'react';

interface CardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass?: string;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, value, icon, colorClass = 'bg-primary text-white', children }) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md flex flex-col justify-between">
        <div className="flex items-start justify-between">
            <div className="flex flex-col">
                <p className="text-slate-500 dark:text-slate-400 text-sm">{title}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
            </div>
            <div className={`p-2 rounded-lg ${colorClass}`}>
                {icon}
            </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

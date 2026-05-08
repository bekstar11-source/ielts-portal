import React, { forwardRef } from 'react';
import { Calendar } from 'lucide-react';

export const customDatepickerStyles = `
  .react-datepicker-wrapper { width: 100%; }
  .react-datepicker { font-family: inherit; border-radius: 0.75rem; border: none; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
  .react-datepicker__header { border-top-left-radius: 0.75rem; border-top-right-radius: 0.75rem; }
  .dark .react-datepicker { background-color: #2C2C2C; color: white; border: 1px solid rgba(255,255,255,0.1); }
  .dark .react-datepicker__header { background-color: #1E1E1E; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .dark .react-datepicker__current-month, .dark .react-datepicker__day-name { color: white; }
  .dark .react-datepicker__day { color: #e2e8f0; }
  .dark .react-datepicker__day:hover { background-color: #3b82f6; color: white; }
  .dark .react-datepicker__day--selected { background-color: #3b82f6; color: white; }
`;

export const TabButton = ({ id, active, onClick, icon: Icon, label, theme }) => (
    <button
        onClick={() => onClick(id)}
        className={`
            flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-bold whitespace-nowrap
            ${active === id
                ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200')
                : (theme === 'dark' ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100')}
        `}
    >
        <Icon size={14} />
        <span className="hidden sm:inline">{label}</span>
    </button>
);

export const CustomDateInput = forwardRef(({ value, onClick, placeholder, disabled, theme }, ref) => (
    <div
        onClick={!disabled ? onClick : undefined}
        ref={ref}
        className={`
            flex items-center justify-between w-full h-8 px-2 rounded-lg border transition-all cursor-pointer
            ${theme === 'dark'
                ? 'bg-[#2C2C2C] border-white/5 text-white hover:border-white/10'
                : 'bg-white border-gray-200 text-gray-900 hover:border-blue-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
    >
        <span className={`text-[11px] font-bold ${!value && 'opacity-50'}`}>{value || placeholder}</span>
        <Calendar size={12} className="opacity-50" />
    </div>
));

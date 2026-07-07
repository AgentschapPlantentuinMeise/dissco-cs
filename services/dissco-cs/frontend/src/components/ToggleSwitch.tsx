import React from 'react';

export const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: string;
}> = ({ checked, onChange, label }) => {
  return (
    <label className="inline-flex items-center cursor-pointer">
      <span className="sr-only">{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <span
        className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-[var(--cs-primary)]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </label>
  );
};

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { IconButton } from '../ui/IconButton';
import { inputClass } from '../ui/input-styles';

// A password field with a button to show what was typed.
export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { t } = useTranslation('dissco-cs');
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${inputClass} w-full pr-10`} />
      <IconButton
        icon={visible ? LuEyeOff : LuEye}
        label={t(visible ? 'password_toggle_hide' : 'password_toggle_show')}
        onClick={() => setVisible(v => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2"
      />
    </div>
  );
}

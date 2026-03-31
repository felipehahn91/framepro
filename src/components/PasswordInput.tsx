"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrength?: boolean;
}

export function PasswordInput({ showStrength, value, onChange, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const valString = (value as string) || '';

  const getStrengthInfo = (pwd: string) => {
    let score = 0;
    if (!pwd) return { score: 0, bg: 'bg-gray-200', text: 'text-gray-500', label: '' };
    
    // Critérios de força
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score, bg: 'bg-red-500', text: 'text-red-500', label: 'Muito Fraca' };
    if (score === 2) return { score, bg: 'bg-orange-500', text: 'text-orange-500', label: 'Razoável' };
    if (score === 3) return { score, bg: 'bg-yellow-500', text: 'text-yellow-500', label: 'Boa' };
    return { score, bg: 'bg-green-500', text: 'text-green-500', label: 'Forte' };
  };

  const strength = getStrengthInfo(valString);

  return (
    <div className="space-y-2 w-full">
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          {...props}
          className={`pr-10 ${props.className || ''}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* Barra de força só aparece se showStrength for true e houver texto */}
      {showStrength && valString.length > 0 && (
        <div className="space-y-1.5 mt-2 animate-in fade-in slide-in-from-top-1">
          <div className="flex gap-1 h-1.5 w-full">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`flex-1 rounded-full transition-colors duration-300 ${
                  strength.score >= level ? strength.bg : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
          <p className={`text-[11px] font-bold uppercase tracking-wider text-right ${strength.text}`}>
            {strength.label}
          </p>
        </div>
      )}
    </div>
  );
}
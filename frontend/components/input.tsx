'use client';

import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export default function Input({
  label,
  error,
  id,
  name,
  className = '',
  onChange,
  ...props
}: InputProps) {
  const inputId = id ?? name;

  return (
    <div className="flex flex-col gap-[6px]">
      <label
        htmlFor={inputId}
        className="text-[14px] leading-[20px] text-[#1A1A1A]"
      >
        {label}
      </label>

      <input
        id={inputId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error && inputId ? `${inputId}-error` : undefined
        }
        onChange={onChange}
        className={`
          h-[46px]
          w-full
          rounded-[6px]
          border
          bg-white
          px-[16px]
          text-[14px]
          text-[#1A1A1A]
          outline-none
          transition-colors
          placeholder:text-[#9A958E]

          ${
            error
              ? `
                border-[#EE4424]
                hover:border-[#EE4424]
                focus:border-[#EE4424]
                focus:bg-white
              `
              : `
                border-[#D9D4CC]
                hover:border-[#726B61]
                focus:border-2
                focus:border-[#726B61]
                focus:bg-[#FAF9F7]
              `
          }

          ${className}
        `}
        {...props}
      />

      {error && inputId && (
        <p
          id={`${inputId}-error`}
          className="text-[12px] leading-[16px] text-[#EE4424]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
'use client';
import { useTranslation } from 'react-i18next';

import type {
  ChangeEvent,
  InputHTMLAttributes,
} from 'react';

type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange'
> & {
  label: string;
  error?: string;
  onChange?: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onValueChange?: (value: string) => void;
};

export default function Input({
  label,
  error,
  id,
  name,
  className = '',
  onChange,
  onValueChange,
  ...props
}: InputProps) {
  const inputId = id ?? name;
  const { t } = useTranslation();

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    onChange?.(event);
    onValueChange?.(event.target.value);
  };

  return (
    <div className="flex flex-col gap-[6px]">
      <label
        htmlFor={inputId}
        className="
          text-[14px]
          leading-[20px]
          text-foreground
        "
      >
        {label}
      </label>

      <input
        id={inputId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error && inputId
            ? `${inputId}-error`
            : undefined
        }
        onChange={handleChange}
        className={`
          h-[46px]
          w-full
          rounded-[6px]
          border
          bg-surface
          px-[16px]
          text-[14px]
          text-foreground
          outline-none
          transition-colors
          placeholder:text-muted-foreground

          ${
            error
              ? `
                border-brand-red
                hover:border-brand-red
                focus:border-brand-red
                focus:bg-surface
              `
              : `
                border-border
                hover:border-muted-foreground
                focus:border-2
                focus:border-muted-foreground
              `
          }

          disabled:cursor-not-allowed
          disabled:bg-background
          disabled:opacity-60

          ${className}
        `}
        {...props}
      />

      {error && inputId && (
        <p
          id={`${inputId}-error`}
          className="
            text-[12px]
            leading-[16px]
            text-brand-red
          "
        >
          {t(error)}
        </p>
      )}
    </div>
  );
}
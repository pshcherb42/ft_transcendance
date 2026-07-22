// lib/validation/auth.schema.ts
import { z } from 'zod';

const usernameRule = z
  .string()
  .min(3, 'validation.username.min')
  .max(20, 'validation.username.max')
  .regex(/^[a-zA-Z0-9_]+$/, 'validation.username.pattern');

const passwordRule = z
  .string()
  .min(8, 'validation.password.min')
  .max(72, 'validation.password.max');

const emptyToUndefined = (val: unknown) =>
  typeof val === 'string' && val.trim() === '' ? undefined : val;

export const registerSchema = z.object({
  email: z.string().email('validation.email.invalid'),
  username: usernameRule,
  password: passwordRule,
});

export const loginSchema = z.object({
  email: z.string().email('validation.email.invalid'),
  password: z.string().min(1, 'validation.password.required'),
});

export const updateProfileSchema = z
  .object({
    username: usernameRule.optional(),
    currentPassword: z.preprocess(emptyToUndefined, passwordRule.optional()),
    newPassword: z.preprocess(emptyToUndefined, passwordRule.optional()),
    confirmPassword: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .refine(
    (data) => !data.newPassword || data.newPassword === data.confirmPassword,
    { message: 'validation.confirmPassword.mismatch', path: ['confirmPassword'] },
  )
  .refine(
    (data) => !data.newPassword || !!data.currentPassword,
    { message: 'validation.currentPassword.required', path: ['currentPassword'] },
  );

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
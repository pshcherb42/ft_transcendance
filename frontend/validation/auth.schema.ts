// lib/validation/auth.schema.ts
import { z } from 'zod';

const usernameRule = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed');

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

const emptyToUndefined = (val: unknown) =>
  typeof val === 'string' && val.trim() === '' ? undefined : val;

export const registerSchema = z.object({
  email: z.string().email('Enter a valid email'),
  username: usernameRule,
  password: passwordRule,
});

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
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
    { message: 'Passwords do not match', path: ['confirmPassword'] },
  )
  .refine(
    (data) => !data.newPassword || !!data.currentPassword,
    { message: 'Current password is required to set a new one', path: ['currentPassword'] },
  );

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
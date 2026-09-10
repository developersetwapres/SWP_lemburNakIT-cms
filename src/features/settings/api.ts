import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { confirmPassword, getPasswordConfirmationStatus } from "@/lib/auth/service";
import { parseJsonApi } from "@/lib/jsonapi";

const profileAttributesSchema = z.object({
  name: z.string(), email: z.string(), role: z.array(z.string()), uuid: z.string().uuid(), image: z.string().nullable(),
  jabatan: z.string().nullable(), nip: z.string().nullable(), kode_biro: z.string().nullable(), is_active: z.boolean(),
  email_verified_at: z.string().nullable(), two_factor_confirmed_at: z.string().nullable(), created_at: z.string(), updated_at: z.string(),
}).passthrough();
const passkeySchema = z.object({ id: z.union([z.string(), z.number()]), name: z.string(), authenticator: z.string(), created_at_diff: z.string(), last_used_at_diff: z.string().nullable() });
const securityAttributesSchema = z.object({
  canManageTwoFactor: z.boolean(), canManagePasskeys: z.boolean(), passkeys: z.array(passkeySchema), passwordRules: z.string(),
  twoFactorEnabled: z.boolean().optional(), requiresConfirmation: z.boolean().optional(),
}).passthrough();

export type Profile = z.infer<typeof profileAttributesSchema> & { id: string; mustVerifyEmail?: boolean; status?: string | null; message?: string };
export type SecuritySettings = z.infer<typeof securityAttributesSchema> & { id: string };
export type PasswordUpdate = { current_password: string; password: string; password_confirmation: string };

export function parseProfile(input: unknown): Profile {
  const document = parseJsonApi(input);
  if (!document.data || Array.isArray(document.data) || document.data.type !== "users") throw new ApiError("Invalid profile resource.", "contract");
  const attributes = profileAttributesSchema.safeParse(document.data.attributes);
  const meta = z.object({ mustVerifyEmail: z.boolean().optional(), status: z.string().nullable().optional(), message: z.string().optional() }).passthrough().safeParse(document.meta ?? {});
  if (!attributes.success || !meta.success) throw new ApiError("Invalid profile contract.", "contract");
  return { id: document.data.id, ...attributes.data, ...meta.data };
}

export function parseSecuritySettings(input: unknown): SecuritySettings {
  const document = parseJsonApi(input);
  if (!document.data || Array.isArray(document.data) || document.data.type !== "security-settings") throw new ApiError("Invalid security settings resource.", "contract");
  const attributes = securityAttributesSchema.safeParse(document.data.attributes);
  if (!attributes.success) throw new ApiError("Invalid security settings contract.", "contract");
  return { id: document.data.id, ...attributes.data };
}

export async function getProfile(signal?: AbortSignal) {
  const response = await apiClient.get<unknown>("/api/settings/profile", { signal });
  return parseProfile(response.data);
}
export async function updateProfile(payload: { name: string; email: string }) {
  const response = await apiClient.patch<unknown>("/api/settings/profile", payload);
  return parseProfile(response.data);
}
export async function getSecuritySettings(signal?: AbortSignal) {
  const response = await apiClient.get<unknown>("/api/settings/security", { signal });
  return parseSecuritySettings(response.data);
}
export async function updatePassword(payload: PasswordUpdate) {
  const response = await apiClient.put<unknown>("/api/settings/password", payload);
  if (response.status !== 204) throw new ApiError("Invalid password update response status.", "contract");
}
export { confirmPassword, getPasswordConfirmationStatus };

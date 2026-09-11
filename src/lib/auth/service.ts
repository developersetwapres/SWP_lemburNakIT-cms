import { z } from "zod";
import { apiClient } from "../api/client";
import { setCsrfToken } from "../api/csrf";
import { ApiError } from "../api/errors";
import { parseJsonApi, resourceSchema } from "../jsonapi";

const userSchema = resourceSchema.extend({ type: z.literal("users"), attributes: z.record(z.string(), z.unknown()) });
const contextSchema = z.object({
  auth: z.object({ user: userSchema.nullable() }),
  name: z.string().optional(), sidebarOpen: z.boolean().optional(), appearance: z.string().optional(),
  canResetPassword: z.boolean().optional(), canRegister: z.boolean().optional(),
  passwordRules: z.string().optional(), mustVerifyEmail: z.boolean().optional(),
  status: z.string().nullable().optional(),
}).passthrough();
export type FrontendContext = z.infer<typeof contextSchema> & { canAccessAdminPanel: boolean };
export type LoginPayload = { email: string; password: string; remember?: boolean };
export type TwoFactorPayload = { code: string; recovery_code?: never } | { recovery_code: string; code?: never };

let csrfRequest: Promise<void> | null = null;
export function bootstrapCsrf(): Promise<void> {
  if (!csrfRequest) {
    csrfRequest = apiClient.get("/sanctum/csrf-cookie").then((response) => {
      setCsrfToken(response.headers["x-csrf-token"]);
    }).finally(() => { csrfRequest = null; });
  }
  return csrfRequest;
}

export async function getFrontendContext(): Promise<FrontendContext> {
  const response = await apiClient.get<unknown>("/api/frontend-context");
  const document = parseJsonApi(response.data);
  const resource = document.data;
  if (!resource || Array.isArray(resource) || resource.type !== "frontend-contexts") {
    throw new ApiError("Invalid frontend context resource.", "contract");
  }
  const attributes = contextSchema.safeParse(resource.attributes);
  const permission = z.boolean().safeParse(document.meta?.canAccessAdminPanel);
  if (!attributes.success || !permission.success) throw new ApiError("Invalid frontend context contract.", "contract");
  return { ...attributes.data, canAccessAdminPanel: attributes.data.auth.user !== null && permission.data };
}

export async function login(payload: LoginPayload): Promise<{ two_factor: boolean }> {
  await bootstrapCsrf();
  const response = await apiClient.post<unknown>("/login", payload);
  const result = z.object({ two_factor: z.boolean() }).safeParse(response.data);
  if (!result.success) throw new ApiError("Invalid Fortify login response.", "contract");
  return result.data;
}

export async function challengeTwoFactor(payload: TwoFactorPayload): Promise<void> {
  const valid = z.union([
    z.object({ code: z.string().regex(/^\d{6}$/) }).strict(),
    z.object({ recovery_code: z.string().min(1) }).strict(),
  ]).safeParse(payload);
  if (!valid.success) throw new ApiError("Provide one six-digit code or one recovery code.", "validation");
  await apiClient.post("/two-factor-challenge", valid.data);
}

export async function logout(): Promise<void> {
  await bootstrapCsrf();
  await apiClient.post("/logout");
}
export async function getPasswordConfirmationStatus(): Promise<boolean> {
  const response = await apiClient.get<unknown>("/user/confirmed-password-status");
  const result = z.object({ confirmed: z.boolean() }).safeParse(response.data);
  if (!result.success) throw new ApiError("Invalid password confirmation response.", "contract");
  return result.data.confirmed;
}
export async function confirmPassword(password: string): Promise<void> {
  await bootstrapCsrf();
  await apiClient.post("/user/confirm-password", { password });
}
export const authService = { getFrontendContext, login, challengeTwoFactor, logout };

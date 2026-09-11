let csrfToken: string | null = null;

export function setCsrfToken(value: unknown) {
  csrfToken = typeof value === "string" && value.trim() ? value : null;
}

export function getCsrfToken() {
  return csrfToken;
}

export function clearCsrfToken() {
  csrfToken = null;
}

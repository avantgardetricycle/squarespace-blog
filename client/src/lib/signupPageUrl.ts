export function isValidSignupPageUrl(input: string): boolean {
  const t = input.trim();
  if (!t) return false;
  try {
    const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(withScheme);
    return Boolean(u.hostname);
  } catch {
    return false;
  }
}

export function signupPageUrlError(input: string): string | null {
  if (!input.trim()) return "Please enter a signup URL";
  if (!isValidSignupPageUrl(input)) {
    return "Enter a valid signup URL (e.g. https://yoursite.com/subscribe).";
  }
  return null;
}

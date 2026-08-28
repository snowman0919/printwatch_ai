export function isSchoolEmail(email: string): boolean {
  return email.toLowerCase().endsWith("@dimigo.hs.kr");
}

export function hasVerifiedSchoolGoogleAccount(
  email: string,
  accounts: ReadonlyArray<{ provider: string; emailAddress: string; verification: { status: string } | null }>,
): boolean {
  const normalized = email.toLowerCase();
  return isSchoolEmail(normalized) && accounts.some((account) =>
    account.provider === "oauth_google"
    && account.verification?.status === "verified"
    && account.emailAddress.toLowerCase() === normalized,
  );
}

const SESSION_KEY = "agreement_session";
const VALID_ROLES = ["Checker", "Approver"];

// Client-side stand-in until POST /api/auth/login exists; this is not real security.
export const DEMO_ACCOUNTS = [
  {
    password: "Checker@123",
    user: { id: "USR-CHECKER", name: "Demo Checker", email: "checker@example.com", role: "Checker" },
  },
  {
    password: "Approver@123",
    user: { id: "USR-APPROVER", name: "Demo Approver", email: "approver@example.com", role: "Approver" },
  },
];

export async function login({ email, password }) {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const account = DEMO_ACCOUNTS.find(
    (candidate) =>
      candidate.user.email === email.trim().toLowerCase() && candidate.password === password
  );
  if (!account) {
    throw new Error("Incorrect email or password.");
  }

  const session = { token: `mock-token-${account.user.id}`, user: account.user };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function loadSessionUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem(SESSION_KEY))?.user;
    return user && VALID_ROLES.includes(user.role) ? user : null;
  } catch {
    return null;
  }
}

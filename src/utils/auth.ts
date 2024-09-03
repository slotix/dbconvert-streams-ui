import { Clerk } from '@clerk/clerk-js';

const clerk = new Clerk(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
await clerk.load();

export async function getToken(): Promise<string> {
  const token = await clerk.session?.getToken();
  if (!token) throw new Error('No token available');
  return token;
}

export function isTokenExpired(token: string): boolean {
  const payload = JSON.parse(atob(token.split('.')[1]));
  const exp = payload.exp * 1000; // Convert to milliseconds
  return Date.now() >= exp;
}

export async function ensureAuth(): Promise<void> {
  if (!clerk.session) {
    await clerk.redirectToSignIn();
  }
}

export { clerk };
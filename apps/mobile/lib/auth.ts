import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY } from "./constants";

/**
 * Saves the JWT token to SecureStore (device-encrypted storage).
 */
export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

/**
 * Retrieves the JWT token from SecureStore.
 * Returns null if no token is stored.
 */
export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

/**
 * Clears the stored JWT token (logout).
 */
export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/**
 * Returns true if a token is currently stored (user is logged in).
 */
export async function isLoggedIn(): Promise<boolean> {
  const token = await getToken();
  return token !== null && token.length > 0;
}

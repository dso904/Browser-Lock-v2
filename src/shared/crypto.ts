// ============================================
// Browser Lock - Cryptography Utilities
// ============================================

/**
 * Hash a password using SHA-256
 * Uses Web Crypto API for security
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const inputHash = await hashPassword(password);
    return inputHash === storedHash;
}

/**
 * Generate a random recovery code
 * Format: XXXX-XXXX-XXXX (12 characters, alphanumeric uppercase)
 */
export function generateRecoveryCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I, O, 0, 1
    const segments: string[] = [];

    for (let i = 0; i < 3; i++) {
        let segment = '';
        for (let j = 0; j < 4; j++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            segment += chars[randomIndex];
        }
        segments.push(segment);
    }

    return segments.join('-');
}

/**
 * Normalize recovery code for comparison (remove dashes, uppercase)
 */
export function normalizeRecoveryCode(code: string): string {
    return code.replace(/-/g, '').toUpperCase();
}

/**
 * Verify a recovery code against a stored hash
 */
export async function verifyRecoveryCode(code: string, storedHash: string): Promise<boolean> {
    const normalizedCode = normalizeRecoveryCode(code);
    const inputHash = await hashPassword(normalizedCode);
    return inputHash === storedHash;
}

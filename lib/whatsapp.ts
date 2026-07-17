/**
 * WhatsApp deep-link helpers for the "notify requester on completion" flow.
 *
 * WhatsApp's click-to-chat endpoint expects the phone in international
 * format with digits only (no +, spaces, or dashes) and the message
 * URL-encoded in the `text` query parameter.
 */

/**
 * Strip formatting (spaces, dashes, dots, parentheses, leading +) and
 * return the bare digit string, or null if what remains isn't a plausible
 * international number (E.164 allows at most 15 digits).
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const stripped = phone.replace(/[\s().-]/g, "").replace(/^\+/, "");
  if (!/^\d{7,15}$/.test(stripped)) return null;
  return stripped;
}

export function hasValidPhone(phone: string | null | undefined): boolean {
  return normalizePhone(phone) !== null;
}

export function completionMessage(requesterName: string, taskTitle: string) {
  return `Hi ${requesterName},\n\nYour request has been completed.\n\nTask: ${taskTitle}\n\nThank you.`;
}

/** Returns null when the phone number is missing or invalid. */
export function buildWhatsAppUrl(
  phone: string | null | undefined,
  text: string,
): string | null {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(text)}`;
}

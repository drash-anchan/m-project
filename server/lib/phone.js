// Normalizes a user-entered Indian phone number to E.164 (+91XXXXXXXXXX)
// so it's ready for both MSG91 (which wants a bare country code + 10 digits)
// and Twilio (which wants E.164).
//
// Accepts things like: "9876543210", "098765 43210", "+91 98765-43210",
// "+91-9876543210". Rejects anything that isn't a plausible Indian mobile
// number — wrong length, or a leading digit outside 6-9 — since this platform
// is explicitly India-scoped end to end and an alert sent to a non-Indian
// number would silently fail at the carrier instead of here.

export function normalizeIndianPhone(raw) {
  if (!raw || typeof raw !== "string") {
    return { valid: false, error: "Phone number is required." };
  }

  const digitsOnly = raw.replace(/[^\d+]/g, "");

  let national;
  if (digitsOnly.startsWith("+91")) {
    national = digitsOnly.slice(3);
  } else if (digitsOnly.startsWith("91") && digitsOnly.length === 12) {
    national = digitsOnly.slice(2);
  } else if (digitsOnly.startsWith("0") && digitsOnly.length === 11) {
    national = digitsOnly.slice(1);
  } else {
    national = digitsOnly.replace(/^\+/, "");
  }

  if (!/^\d{10}$/.test(national)) {
    return {
      valid: false,
      error:
        "Enter a valid 10-digit Indian phone number, with or without a +91 prefix.",
    };
  }

  // Indian mobile numbers begin with 6, 7, 8 or 9 (TRAI's National Numbering
  // Plan). Checking this here turns "+15551234567" or a mistyped landline into
  // an immediate, understandable message instead of a 502 from MSG91/Twilio
  // several seconds later — which, in an emergency dispatch flow, is the
  // difference between retyping the number and assuming the alert went out.
  if (!/^[6-9]/.test(national)) {
    return {
      valid: false,
      error:
        "That doesn't look like an Indian mobile number — Indian mobiles start with 6, 7, 8 or 9. SMS and voice alerts can only be sent to Indian numbers.",
    };
  }

  return { valid: true, e164: `+91${national}`, national };
}

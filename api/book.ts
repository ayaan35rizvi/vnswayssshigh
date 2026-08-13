/**
 * Vercel serverless API route: booking enquiry -> email via Resend.
 * Receives the same payload shape as the site's booking form.
 *
 * Env required (set in Vercel dashboard -> Settings -> Environment Variables):
 *   RESEND_API_KEY
 *   BOOKING_RECIPIENT_EMAIL (defaults to khanyasir7275@gmail.com)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

const RECIPIENT = process.env.BOOKING_RECIPIENT_EMAIL ?? "khanyasir7275@gmail.com";
const SENDER = process.env.RESEND_SENDER ?? "onboarding@resend.dev";
const SITE = "Varanasi Tour & Travels";

interface BookingInput {
  type?: "quickCallback" | string;
  fullName?: string;
  phone?: string;
  pickupDate?: string;
  pickupLocation?: string;
  dropLocation?: string;
  tripType?: string;
  vehicle?: string;
  passengers?: number | string;
  notes?: string;
}

interface CallbackInput {
  type?: string;
  fullName?: string;
  phone?: string;
}

function validatePhone(phone: string | undefined): string | null {
  if (typeof phone !== "string") return "Please enter a valid phone number.";
  const digits = phone.trim().replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return "Please enter a valid phone number.";
  return null;
}

function validate(body: unknown): { ok: true; data: BookingInput } | { ok: false; message: string } {
  const b = body as BookingInput | undefined;
  if (!b || typeof b !== "object") return { ok: false, message: "Invalid request body." };
  if (b.type === "quickCallback") {
    const cb = b as unknown as CallbackInput;
    if (typeof cb.fullName !== "string" || cb.fullName.trim().length < 2) {
      return { ok: false, message: "Missing or invalid field: fullName." };
    }
    const phoneErr = validatePhone(cb.phone);
    if (phoneErr) return { ok: false, message: phoneErr };
    return { ok: true, data: { ...b, fullName: cb.fullName, phone: cb.phone } };
  }
  const required: (keyof BookingInput)[] = ["fullName", "phone", "pickupDate", "pickupLocation", "dropLocation"];
  for (const k of required) {
    const v = b[k];
    if (typeof v !== "string" || v.trim().length < 2) {
      return { ok: false, message: `Missing or invalid field: ${k}.` };
    }
  }
  const phoneErr = validatePhone(b.phone);
  if (phoneErr) return { ok: false, message: phoneErr };
  const dateStr = (b.pickupDate as string).trim();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { ok: false, message: "Please enter a valid pickup date." };
  if (d < new Date(new Date().setHours(0, 0, 0, 0))) {
    return { ok: false, message: "Pickup date cannot be in the past." };
  }
  const passengers = b.passengers;
  if (passengers !== undefined) {
    const n = typeof passengers === "number" ? passengers : Number(passengers);
    if (!Number.isFinite(n) || n < 1 || n > 50) {
      return { ok: false, message: "Passenger count must be between 1 and 50." };
    }
  }
  return { ok: true, data: b };
}

function callbackHtml(b: BookingInput): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #d97706;">New Quick Call-Back Request</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; font-weight: bold; width: 150px;">Name</td><td>${b.fullName}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Phone</td><td><a href="tel:${b.phone}" style="color:#d97706;">${b.phone}</a></td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Request Type</td><td>Quick Call Back (urgent lead)</td></tr>
      </table>
      <p style="margin-top: 18px; font-size: 12px; color: #777;">
        The visitor asked for a quick call back. Please call them back as soon as possible.
        Submitted via ${SITE} homepage.
      </p>
    </div>
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers so any deployment origin works
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const validation = validate(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.message });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Email service is not configured on the server." });
    return;
  }

  const b = validation.data;
  const isCallback = b.type === "quickCallback";
  const payload = {
    from: SENDER,
    to: [RECIPIENT],
    subject: isCallback ? "New Call-Back Request — URGENT LEAD" : `New booking enquiry — ${b.tripType ?? "Cab booking"} (${b.vehicle ?? "any vehicle"})`,
    html: isCallback ? callbackHtml(b) : `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #d97706;">New Booking Enquiry</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; font-weight: bold; width: 150px;">Name</td><td>${b.fullName}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">Phone</td><td>${b.phone}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">Pickup Date</td><td>${b.pickupDate}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">Pickup From</td><td>${b.pickupLocation}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">Drop To</td><td>${b.dropLocation}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">Trip Type</td><td>${b.tripType ?? "—"}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">Vehicle</td><td>${b.vehicle ?? "—"} (starting fare shown on site)</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">Passengers</td><td>${b.passengers ?? "—"}</td></tr>
          ${b.notes ? `<tr><td style="padding: 6px 0; font-weight: bold;">Notes</td><td>${b.notes}</td></tr>` : ""}
        </table>
        <p style="margin-top: 18px; font-size: 12px; color: #777;">
          Enquiry submitted via ${SITE} website booking form.
        </p>
      </div>
    `,
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Resend error:", response.status, errText);
    res.status(502).json({ error: "Failed to send the enquiry email. Please call or WhatsApp us instead." });
    return;
  }

  res.status(200).json({ success: true });
}

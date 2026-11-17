import https from "https";
import { URL } from "url";
import { createHash, randomInt } from "crypto";
import nodemailer from "nodemailer";
import { db } from "./db";

export interface VerifiedProfile {
  mode: "email" | "phone";
  identifier: string; // lowercase email or E.164 phone e.g. +919876543210
  name: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthProvider {
  readonly name: string;
  verifyPhoneEmail(userJsonUrl: string, method?: "email" | "phone"): Promise<VerifiedProfile>;
  sendEmailOtp?(email: string): Promise<{ success: boolean; message?: string }>;
  verifyEmailOtp?(email: string, code: string): Promise<{ success: boolean; profile?: VerifiedProfile; error?: string }>;
}

// ---------------------------------------------------------------------------
// 1. Official Phone.email Provider (Active Default)
// ---------------------------------------------------------------------------

export class PhoneEmailAuthProvider implements AuthProvider {
  readonly name = "phone.email";

  /**
   * Validates user_json_url to prevent SSRF and tampering.
   */
  private validateUrl(urlStr: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      throw new Error("Invalid user_json_url: Not a valid URL.");
    }
    if (parsed.protocol !== "https:") {
      throw new Error("Invalid user_json_url: Must use https protocol.");
    }
    if (parsed.hostname !== "user.phone.email") {
      throw new Error('Invalid user_json_url: Hostname must be exactly "user.phone.email".');
    }
    return parsed;
  }

  async verifyPhoneEmail(userJsonUrl: string, method?: "email" | "phone"): Promise<VerifiedProfile> {
    this.validateUrl(userJsonUrl);

    return new Promise((resolve, reject) => {
      const req = https.get(
        userJsonUrl,
        {
          timeout: 5000,
          headers: {
            "User-Agent": "NotesPlatform-Auth/2.0",
            Accept: "application/json",
          },
        },
        (res) => {
          // Reject redirects to prevent SSRF redirect chains
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
            return reject(new Error("Redirects are disallowed for phone.email verification."));
          }

          if (res.statusCode !== 200) {
            return reject(
              new Error(`Phone.email verification failed with HTTP status ${res.statusCode}`)
            );
          }

          let rawData = "";
          res.setEncoding("utf8");

          res.on("data", (chunk) => {
            rawData += chunk;
          });

          res.on("end", () => {
            try {
              const jsonData = JSON.parse(rawData);

              // 1. Email verification
              if (jsonData.user_email_id && (method === "email" || !jsonData.user_phone_number)) {
                const email = String(jsonData.user_email_id).trim().toLowerCase();
                const firstName = jsonData.user_first_name || "";
                const lastName = jsonData.user_last_name || "";
                const fullName = [firstName, lastName].filter(Boolean).join(" ");

                return resolve({
                  mode: "email",
                  identifier: email,
                  name: fullName || email.split("@")[0],
                  email,
                  firstName,
                  lastName,
                });
              }

              // 2. Phone verification
              if (jsonData.user_phone_number) {
                let countryCode = String(jsonData.user_country_code || "").trim();
                if (countryCode && !countryCode.startsWith("+")) {
                  countryCode = "+" + countryCode;
                }
                const phoneNumber = String(jsonData.user_phone_number).trim();
                const fullPhone = `${countryCode}${phoneNumber}`;

                const firstName = jsonData.user_first_name || "";
                const lastName = jsonData.user_last_name || "";
                const fullName = [firstName, lastName].filter(Boolean).join(" ");

                return resolve({
                  mode: "phone",
                  identifier: fullPhone,
                  name: fullName || fullPhone,
                  phone: fullPhone,
                  countryCode,
                  firstName,
                  lastName,
                });
              }

              return reject(
                new Error("Invalid phone.email payload: Neither user_email_id nor user_phone_number found.")
              );
            } catch (e: any) {
              reject(new Error(`Failed to parse phone.email response: ${e.message}`));
            }
          });
        }
      );

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Phone.email verification request timed out (5s limit)."));
      });

      req.on("error", (err) => {
        reject(new Error(`Phone.email network error: ${err.message}`));
      });
    });
  }
}

// ---------------------------------------------------------------------------
// 2. Brevo Email OTP Provider (Disabled by default)
// ---------------------------------------------------------------------------

export class BrevoEmailOtpProvider implements AuthProvider {
  readonly name = "email-otp-brevo";
  private apiKey: string;
  private senderEmail: string;

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || "";
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || "no-reply@notes.com";
  }

  async verifyPhoneEmail(userJsonUrl: string, method?: "email" | "phone"): Promise<VerifiedProfile> {
    // Brevo provider delegates Phone.email verification to PhoneEmailAuthProvider
    const fallback = new PhoneEmailAuthProvider();
    return fallback.verifyPhoneEmail(userJsonUrl, method);
  }

  async sendEmailOtp(email: string): Promise<{ success: boolean; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    // 1. Generate 6-digit code
    const code = randomInt(100000, 999999).toString();

    // 2. Hash code with secret salt
    const salt = process.env.JWT_SECRET || "brevo_salt_secret_123456";
    const hashedCode = createHash("sha256").update(`${cleanEmail}:${code}:${salt}`).digest("hex");

    // 3. Rate limit: 3 requests per hour, expiry: 10 minutes
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const saved = await db.otpCodes.saveOtp(cleanEmail, hashedCode, expiresAt);
    if (!saved) {
      return {
        success: false,
        message: "Too many OTP requests. Maximum 3 requests per hour allowed for this email.",
      };
    }

    // 4. Record in Admin OTP logs (visible in Admin Console for manual verification)
    await db.otpLogs.record(cleanEmail, code, expiresAt);

    const emailSubject = `Your GATE Notes Login Code: ${code}`;
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0b0f19; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #6366f1; margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">GATE Notes Platform</h2>
          <p style="font-size: 14px; color: #94a3b8; margin: 0;">Verification Passcode</p>
        </div>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5; margin: 0 0 16px 0;">Use the 6-digit code below to complete your login. This code will expire in <strong>10 minutes</strong>.</p>
        <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; padding: 20px; background: #131b2e; color: #38bdf8; text-align: center; border-radius: 12px; border: 1px solid #1e293b; margin: 24px 0;">
          ${code}
        </div>
        <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">If you didn't request this login passcode, you can safely ignore this email.</p>
      </div>
    `;

    // ── Method 1: Brevo Transactional Email API ────────────────────────────
    if (this.apiKey) {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { email: this.senderEmail, name: "GATE Notes Platform" },
          to: [{ email: cleanEmail }],
          subject: emailSubject,
          htmlContent: emailHtml,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Brevo API error (${response.status}): ${errBody}`);
      }
      return { success: true, message: "Verification code sent to your email via Brevo." };
    }

    // ── Method 2: Resend API ───────────────────────────────────────────────
    const resendApiKey = process.env.RESEND_API_KEY || "";
    if (resendApiKey) {
      const resendSender = process.env.RESEND_SENDER_EMAIL || this.senderEmail || "onboarding@resend.dev";
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendSender,
          to: [cleanEmail],
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Resend API error (${response.status}): ${errBody}`);
      }
      return { success: true, message: "Verification code sent to your email via Resend." };
    }

    // ── Method 3: Gmail SMTP / Custom SMTP (nodemailer) ────────────────────
    const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER || "";
    const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "";
    if (gmailUser && gmailPass) {
      const isGmail = !process.env.SMTP_HOST || process.env.SMTP_HOST.includes("gmail");
      const transporter = nodemailer.createTransport(
        isGmail
          ? {
              service: "gmail",
              auth: { user: gmailUser, pass: gmailPass },
            }
          : {
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT || 587),
              secure: process.env.SMTP_SECURE === "true",
              auth: { user: gmailUser, pass: gmailPass },
            }
      );

      await transporter.sendMail({
        from: `"GATE Notes Platform" <${gmailUser}>`,
        to: cleanEmail,
        subject: emailSubject,
        html: emailHtml,
      });

      return { success: true, message: "Verification code sent to your email." };
    }

    // ── Fallback: Local Dev Mode (No email provider configured) ─────────────
    console.log(
      `\n╔════════════════════════════════════════════════════════════════╗\n` +
      `║  [DEV MODE] Email OTP for: ${cleanEmail.padEnd(35)} ║\n` +
      `║  Code: ${code}                                                ║\n` +
      `║  Expires in 10 minutes                                         ║\n` +
      `║  NOTE: No email API key (BREVO_API_KEY, RESEND_API_KEY, or    ║\n` +
      `║  GMAIL_APP_PASSWORD) is configured in .env.local yet!         ║\n` +
      `╚════════════════════════════════════════════════════════════════╝\n`
    );

    return {
      success: true,
      message:
        "OTP requested! The passcode has been logged in the Admin Panel for the administrator to review and provide.",
    };
  }

  async verifyEmailOtp(
    email: string,
    code: string
  ): Promise<{ success: boolean; profile?: VerifiedProfile; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const stored = await db.otpCodes.getOtp(cleanEmail);

    if (!stored) {
      return { success: false, error: "No pending verification code found. Please request a new one." };
    }

    if (Date.now() > stored.expiresAt) {
      await db.otpCodes.deleteOtp(cleanEmail);
      return { success: false, error: "Verification code has expired. Please request a new one." };
    }

    if (stored.attempts >= 5) {
      await db.otpCodes.deleteOtp(cleanEmail);
      return { success: false, error: "Too many failed attempts. Please request a new code." };
    }

    const salt = process.env.JWT_SECRET || "brevo_salt_secret_123456";
    const hashedInput = createHash("sha256").update(`${cleanEmail}:${code.trim()}:${salt}`).digest("hex");

    if (hashedInput !== stored.hashedCode) {
      const attempts = await db.otpCodes.incrementAttempts(cleanEmail);
      return { success: false, error: `Invalid code. ${5 - attempts} attempt(s) remaining.` };
    }

    // Success! Clear OTP code and mark verified in audit log
    await db.otpCodes.deleteOtp(cleanEmail);
    await db.otpLogs.markVerified(cleanEmail);

    return {
      success: true,
      profile: {
        mode: "email",
        identifier: cleanEmail,
        name: cleanEmail.split("@")[0],
        email: cleanEmail,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Provider Factory
// ---------------------------------------------------------------------------

let activeProvider: AuthProvider | null = null;

export function getAuthProvider(): AuthProvider {
  if (activeProvider) return activeProvider;

  const configuredProvider = process.env.AUTH_PROVIDER?.toLowerCase() || "";
  // Activate Brevo provider when explicitly requested
  // (also works in dev with no BREVO_API_KEY — falls back to console logging)
  if (configuredProvider === "email-otp-brevo") {
    activeProvider = new BrevoEmailOtpProvider();
  } else {
    activeProvider = new PhoneEmailAuthProvider();
  }

  return activeProvider;
}

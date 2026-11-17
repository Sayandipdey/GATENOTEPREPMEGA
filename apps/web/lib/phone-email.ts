/**
 * @file phone-email.ts
 * @description Server-side verification for Phone.email Sign in with Email & Sign in with Phone.
 *
 * Implements the exact backend verification pattern from Phone.email documentation:
 * https://www.phone.email/docs-sign-in-with-email
 * https://www.phone.email/docs-sign-in-with-phone
 */

import https from "https";
import { URL } from "url";

export interface PhoneEmailUser {
  mode: "email" | "phone";
  identifier: string; // lowercased email or E.164 phone e.g. +919876543210
  name: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Validates the user_json_url from Phone.email to prevent SSRF and tampering.
 */
function validateUserJsonUrl(userJsonUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(userJsonUrl);
  } catch {
    throw new Error("Invalid user_json_url: Not a valid URL string.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Invalid user_json_url: Must use https protocol.");
  }

  if (parsed.hostname !== "user.phone.email") {
    throw new Error('Invalid user_json_url: Hostname must be exactly "user.phone.email".');
  }

  return parsed;
}

/**
 * Fetches verified user details from user_json_url using Node.js https.
 * Supports both Sign in with Email and Sign in with Phone.
 */
export function fetchPhoneEmailUser(userJsonUrl: string): Promise<PhoneEmailUser> {
  return new Promise((resolve, reject) => {
    try {
      validateUserJsonUrl(userJsonUrl);
    } catch (err) {
      return reject(err);
    }

    const req = https.get(
      userJsonUrl,
      {
        timeout: 5000,
        headers: {
          "User-Agent": "NotesPlatform-Auth/1.0",
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

            // 1. Check for Sign in with Email
            if (jsonData.user_email_id) {
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

            // 2. Check for Sign in with Phone
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
            reject(new Error(`Failed to parse phone.email response JSON: ${e.message}`));
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

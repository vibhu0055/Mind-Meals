// =============================================================
// NOTIFICATION SERVICE
// Sends malnutrition alerts to parents of at-risk students.
//
// Triggered when a health record is saved and the student's
// WHO category is severe_thinness or thinness.
//
// Each channel (email / SMS) is gated by its own env vars —
// the server runs fine with neither configured.
// =============================================================

// ── Lazy transport loaders ────────────────────────────────────────────────────

import dns from "node:dns";


const getMailer = async () => {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return null;
  }

  try {
    const nodemailer = (await import("nodemailer")).default;

    const dns = await import("node:dns/promises");

    console.log(await dns.lookup(process.env.SMTP_HOST, { all: true }));

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,

      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },

      // Force IPv4
      lookup(hostname, options, callback) {
        dns.lookup(hostname, { family: 4 }, callback);
      },
    });

  } catch (err) {
    console.error(err);
    console.warn("⚠️ nodemailer not installed — email alerts disabled");
    return null;
  }
};

const getTwilio = async () => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER)
    return null;
  try {
    const twilio = (await import('twilio')).default;
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch {
    console.warn('⚠️  twilio not installed — SMS alerts disabled');
    return null;
  }
};

// ── Severity helpers ──────────────────────────────────────────────────────────

// Only alert for these two WHO categories
export const ALERT_CATEGORIES = ['severe_thinness', 'thinness'];

const SEVERITY = {
  severe_thinness: { label: 'Critical Malnutrition', emoji: '🔴' },
  thinness:        { label: 'Moderate Malnutrition',  emoji: '🟡' },
};

// ── Message formatters ────────────────────────────────────────────────────────

/**
 * SMS — trimmed to fit within ~2 Twilio segments (~306 chars).
 * Nudges the parent and points them to the email for full details.
 */
export const formatAlertSMS = (studentName, whoCategory, rda, bmi, recordedAt) => {
  const sev  = SEVERITY[whoCategory];
  const date = new Date(recordedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  // No emojis — they trigger UCS-2 encoding and drop the limit to 70 chars/segment.
  // This message stays plain GSM-7 and fits within 160 characters.
  return `MealMind: ${studentName} flagged for ${sev.label} (BMI ${bmi}, ${date}). Increase eggs, dal, milk, rice and other nutrient-rich foods.`;
};

/**
 * HTML email — readable, warm, not clinical.
 * Shows severity + a full RDA table with simple food guidance.
 */
export const formatAlertEmail = (studentName, whoCategory, rda, bmi, recordedAt, className) => {
  const sev  = SEVERITY[whoCategory];
  const date = new Date(recordedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const headerColor = whoCategory === 'severe_thinness' ? '#c0392b' : '#d68910';
  const headerBg    = whoCategory === 'severe_thinness' ? '#fdedec' : '#fef9e7';

  const rdaRows = [
    ['Calories', `${rda.calories_kcal} kcal`, 'Rice, roti, potato, banana'],
    ['Protein',  `${rda.protein_g} g`,        'Eggs, dal, paneer, milk, soya'],
    ['Carbs',    `${rda.carbs_g} g`,           'Rice, bread, oats, fruits'],
    ['Fat',      `${rda.fat_g} g`,             'Ghee, groundnuts, coconut, oils'],
    ['Iron',     `${rda.iron_mg} mg`,          'Spinach, rajma, jaggery, meat'],
    ['Calcium',  `${rda.calcium_mg} mg`,       'Milk, curd, ragi, sesame seeds'],
    ['Fiber',    `${rda.fiber_g} g`,           'Vegetables, fruits, whole grains'],
  ].map(([nutrient, value, sources]) => `
    <tr>
      <td style="padding:9px 14px;border-bottom:1px solid #eee;font-weight:600">${nutrient}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #eee;text-align:center;font-weight:700;color:#2d6a4f">${value}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #eee;color:#555;font-size:13px">${sources}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
<div style="max-width:580px;margin:30px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.10)">

  <!-- Header -->
  <div style="background:#2d6a4f;padding:22px 28px">
    <p style="margin:0;color:#b7e4c7;font-size:13px">MealMind · PM-POSHAN Nutrition Tracker</p>
    <h1 style="margin:6px 0 0;color:#fff;font-size:20px">🍱 Child Health Alert</h1>
  </div>

  <!-- Alert banner -->
  <div style="background:${headerBg};border-left:5px solid ${headerColor};padding:16px 28px;margin:0">
    <p style="margin:0;font-size:16px;font-weight:700;color:${headerColor}">${sev.emoji} ${sev.label} Detected</p>
    <p style="margin:6px 0 0;color:#555;font-size:14px">
      A recent health check on <strong>${date}</strong> for your child
      <strong>${studentName}</strong>${className ? ` (${className})` : ''} has flagged a nutritional concern.
      BMI recorded: <strong>${bmi}</strong>.
    </p>
  </div>

  <!-- What this means -->
  <div style="padding:20px 28px 0">
    <h2 style="font-size:15px;color:#333;margin:0 0 8px">What does this mean?</h2>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0">
      ${whoCategory === 'severe_thinness'
        ? 'Your child\'s BMI is significantly below the healthy range for their age. This can affect their mental development, concentration, and long-term growth. <strong>Please consult a doctor soon.</strong>'
        : 'Your child\'s BMI is below the healthy range for their age. With the right nutrition at home, this can be corrected. Monitor their intake and consult a doctor if there is no improvement in 4–6 weeks.'
      }
    </p>
  </div>

  <!-- RDA table -->
  <div style="padding:20px 28px 0">
    <h2 style="font-size:15px;color:#333;margin:0 0 12px">📊 Your child's daily nutritional needs (RDA)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;background:#fafafa;border-radius:6px;overflow:hidden">
      <thead>
        <tr style="background:#2d6a4f;color:#fff">
          <th style="padding:10px 14px;text-align:left">Nutrient</th>
          <th style="padding:10px 14px;text-align:center">Daily Target</th>
          <th style="padding:10px 14px;text-align:left">Good Food Sources</th>
        </tr>
      </thead>
      <tbody>${rdaRows}</tbody>
    </table>
    <p style="font-size:12px;color:#999;margin-top:8px">
      RDA based on ICMR guidelines for your child's age group and gender.
    </p>
  </div>

  <!-- Tips -->
  <div style="padding:20px 28px">
    <h2 style="font-size:15px;color:#333;margin:0 0 10px">💡 Simple tips for home</h2>
    <ul style="font-size:14px;color:#555;line-height:1.8;padding-left:18px;margin:0">
      <li>Add a small portion of <strong>dal, egg, or paneer</strong> to every meal.</li>
      <li>Give a glass of <strong>milk or curd</strong> daily for calcium and protein.</li>
      <li>Include <strong>seasonal fruits</strong> as snacks instead of packaged foods.</li>
      <li>Ensure your child eats <strong>3 full meals</strong> — skipping meals worsens the deficit.</li>
      <li>If appetite is low, try smaller, more frequent meals throughout the day.</li>
    </ul>
  </div>

  <!-- Footer -->
  <div style="background:#f9f9f9;padding:16px 28px;border-top:1px solid #eee;text-align:center">
    <p style="font-size:12px;color:#aaa;margin:0">
      This alert was sent by your child's school via MealMind.<br>
      For concerns, contact the school directly.
    </p>
  </div>

</div>
</body>
</html>`;
};

// ── Main dispatcher ───────────────────────────────────────────────────────────

/**
 * Sends a malnutrition alert to a parent.
 *
 * @param {object} opts
 * @param {string}      opts.studentName
 * @param {string|null} opts.parentEmail
 * @param {string|null} opts.parentPhone
 * @param {string}      opts.whoCategory   — 'severe_thinness' | 'thinness'
 * @param {number}      opts.bmi
 * @param {string}      opts.recordedAt    — ISO date string
 * @param {object}      opts.rda           — row from rda_reference
 * @param {string|null} opts.className     — optional, shown in email
 *
 * @returns {{ email: 'sent'|'skipped'|'error'|'unconfigured',
 *             sms:   'sent'|'skipped'|'error'|'unconfigured',
 *             errors: string[] }}
 */
export const sendMalnutritionAlert = async ({
  studentName,
  parentEmail,
  parentPhone,
  whoCategory,
  bmi,
  recordedAt,
  rda,
  className = null,
}) => {
  const result = { email: 'skipped', sms: 'skipped', errors: [] };

  // ── Email ──────────────────────────────────────────────────────────────────
  if (parentEmail) {
    const mailer = await getMailer();
    if (!mailer) {
      result.email = 'unconfigured';
    } else {
      try {
        const sev = SEVERITY[whoCategory];
        await mailer.sendMail({
          from:    process.env.SMTP_FROM || process.env.SMTP_USER,
          to:      parentEmail,
          subject: `${sev.emoji} Health Alert for ${studentName} — ${sev.label}`,
          html:    formatAlertEmail(studentName, whoCategory, rda, bmi, recordedAt, className),
        });
        result.email = 'sent';
      } catch (err) {
        result.email = 'error';
        result.errors.push(`Email: ${err.message}`);
        console.error('Alert email error:', err);
      }
    }
  }

  // ── SMS ────────────────────────────────────────────────────────────────────
  if (parentPhone) {
    const client = await getTwilio();
    if (!client) {
      result.sms = 'unconfigured';
    } else {
      try {
        await client.messages.create({
          from: process.env.TWILIO_FROM_NUMBER,
          to:   `+91${parentPhone}`,
          body: formatAlertSMS(studentName, whoCategory, rda, bmi, recordedAt),
        });
        result.sms = 'sent';
      } catch (err) {
        result.sms = 'error';
        result.errors.push(`SMS: ${err.message}`);
        console.error('Alert SMS error:', err);
      }
    }
  }

  return result;
};
# Memsum Privacy Policy

**Effective date: [[Effective date YYYY-MM-DD]]**
**Last updated: [[Last updated YYYY-MM-DD]]**

Memsum ("we," "us," or the "Service") values your privacy and complies with applicable data protection laws, including the Korean Personal Information Protection Act (PIPA) and, where applicable, the EU General Data Protection Regulation (GDPR). This Privacy Policy explains what information the Memsum mobile application (iOS and Android, package identifier `app.memsum`) processes, for what purposes, and how we protect it.

Memsum detects and organizes your screenshots to help you extract text (OCR), summarize content, automatically add events to your calendar, and receive a weekly report.

---

## 1. Information We Process and Why

The Service processes the information below. We **do not collect sign-up information such as your name, email address, or phone number**, and the app operates using anonymous authentication only (see Section 2).

| Category | Data processed | Purpose | Where it is processed |
|---|---|---|---|
| Images (screenshots) | Screenshot images you choose to process in the app (stored as a compressed, resized JPEG copy) | Text extraction (OCR) and preview thumbnails | Uploaded to and stored in a private Supabase Storage bucket |
| Text (OCR output) | Text extracted from images, plus the cleaned-up summary and the events (title, date, time, location) derived from it | Correct typos/spacing, generate a one-line title and summary, extract calendar events, classify content, and build the weekly report | Stored in the Supabase database; portions are sent to OpenAI during processing (see Section 4) |
| Google Calendar auth tokens | Google OAuth access and refresh tokens (only if you enable calendar integration yourself) | Add extracted events to your Google Calendar (primary calendar) | **Stored only in secure storage on your device** (iOS Keychain / Android Keystore). Not stored on or transmitted to our servers |
| Connected account identifier | The email address of the connected Google account, shown for display purposes when calendar integration is enabled | Show you which Google account is connected | Stored only in secure on-device storage, together with the auth tokens above |
| Nickname | An optional display nickname you enter | Personalized display, such as in-app greetings | **Stored only in on-device local storage (AsyncStorage).** Not transmitted to our servers |
| Settings | Toggles such as auto-detection, automatic calendar registration, weekly report notifications, and tone | Persist your preferences | Stored only in local storage on your device |

### Photo (screenshot) access permission

- The Service requests operating-system photo access to process screenshots:
  - iOS: Photo Library access (`NSPhotoLibraryUsageDescription`)
  - Android: Image media access (`READ_MEDIA_IMAGES`)
- You can change or revoke this permission at any time in your device settings.
- The only images we upload and process are screenshots you choose to process within the app.

---

## 2. Anonymous Authentication — No Account Identifiers Collected

- The Service uses **anonymous authentication**. You do not register with an email, password, phone number, or social login.
- We do not collect information that identifies you (such as your real name, email, or phone number). To distinguish each user's data internally, we use only a randomly generated anonymous user identifier (UUID).
- Only if you enable Google Calendar integration, the connected Google account email may be processed for connection display, and it is stored **only on your device** (see Section 1).

---

## 3. Retention and Deletion

- **Image and text data**: Retained until you delete it through the app or request deletion via the contact in Section 9. Because the Service is designed to preserve your captures and summaries so you can revisit them, we do not apply a separate automatic expiration period.
- **In-app deletion**: In the app, you can tap **Settings → "Data" section → "Delete my data"** and confirm the dialog to permanently delete all of your captures, images, weekly reports, and feedback from the server. Separately, you may also request deletion via the contact in Section 9.
- **Google Calendar auth tokens, nickname, and settings**: Stored only on your device. They are removed when you disconnect the integration in the app or delete the app.
- **Deletion method**: Electronic records are permanently deleted in a manner that prevents recovery or reproduction. When you delete data, the corresponding image (Storage object) and database record are removed.
- Where retention is required by applicable law, we retain the relevant data for the period required by that law and then delete it (specific items will be stated in this Policy at that time).

---

## 4. Service Providers, Third Parties, and International Transfers

To provide core functionality, the Service relies on the providers below, and processing may take place outside your country. We do not sell personal information or share it for advertising purposes.

| Recipient / Processor | Data transferred | Purpose | Location | Notes |
|---|---|---|---|---|
| OpenAI, L.L.C. (USA) | OCR-extracted text (portions of text extracted from images) | Clean up and summarize text, extract events, classify content, and generate the weekly report (`gpt-4o-mini` model) | United States and others | Original image files are not sent — only extracted text. Text processing is invoked solely through our server (Edge Function) |
| Google LLC (USA) | Event details (title, date/time, location) and OAuth authentication data | Add events to your Google Calendar; Google account authentication (OAuth) | United States and others | Occurs only if you enable calendar integration. The requested scope is limited to `calendar.events` (event creation); full calendar read access is not requested |
| Supabase Inc. (infrastructure hosting) | Images (screenshot copies), OCR/summary text, anonymous user identifier | Data storage (database and storage) and anonymous authentication | Seoul region, South Korea (ap-northeast-2) | All data is protected by Row-Level Security (RLS) so each user can access only their own data |

- **International transfers**: Some processing (e.g., OpenAI and Google) may occur outside your country, including in the United States. By using the Service, you consent to such processing. The transferred items, purposes, and retention periods are as described in the table above and throughout this Policy.
- For details on how each provider processes data, please refer to that provider's own privacy policy.

---

## 5. Compliance with Google API Services User Data Policy (Limited Use)

Memsum's use and transfer of information received from Google APIs (including Google Calendar) adheres to the **[Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)**, including the Limited Use requirements. Specifically:

- Memsum uses data obtained through Google Calendar permissions **only to provide the user-facing feature you explicitly requested** — adding extracted events to your Google Calendar.
- Memsum does not transfer or sell this data to third parties for any purpose, including advertising.
- Memsum does not allow humans to read this data, except to provide the user-facing feature, for security purposes, or to comply with applicable law.
- The requested OAuth scope is limited to the minimum **`calendar.events` (calendar event creation)** scope; we do not request unnecessary scopes such as full calendar read access.
- Google OAuth tokens are not stored on our servers — they are stored **only in secure storage on your device** (iOS Keychain / Android Keystore).

---

## 6. Your Rights and How to Exercise Them

You have the following rights regarding your personal information:

- **Access and correction**: You can view your stored captures, summaries, and event data directly in the app.
- **Deletion**: In the app, you can permanently delete all of your captures, images, weekly reports, and feedback directly via **Settings → "Data" section → "Delete my data"**. You may also request deletion via the contact below. Deleting the app removes the nickname, settings, and Google tokens stored on your device. (Data backup and export features are currently in preparation.)
- **Disconnect Google Calendar**: You can disconnect Google Calendar at any time in the app's settings. On disconnection, the Google OAuth tokens stored on your device are deleted, and we also attempt to revoke the tokens with Google. You may also revoke Memsum's access directly in your [Google Account security settings](https://myaccount.google.com/permissions).
- **Permission revocation**: You can revoke photo access at any time in your device settings.
- **Restriction and withdrawal of consent**: You can request that we suspend processing or withdraw your consent.

To exercise these rights, contact us using the details in Section 9. We will act without undue delay within the period required by applicable law. If you are in a region where GDPR applies, you may additionally have the rights to data portability, restriction of processing, and to lodge a complaint with a supervisory authority.

---

## 7. Security Measures

- **Encryption in transit**: All server communication is encrypted with HTTPS (TLS).
- **Access control (Row-Level Security)**: All data tables and storage apply Row-Level Security (RLS) so each user can access only their own data.
- **Private storage**: The bucket where images are stored is private, and previews are served only through short-lived signed URLs.
- **Secure on-device storage**: Google OAuth tokens are stored encrypted in the operating system's secure storage (Keychain/Keystore).
- **Secret separation**: Sensitive server secrets such as the OpenAI API key are never bundled into the client app and are used only on the server (Edge Function).

---

## 8. Children's Privacy

- Memsum **is not directed to children** and does not knowingly collect personal information from children under the age of 14.
- In regions where GDPR or similar laws apply, the Service is not directed to children below the minimum age set by local law (for example, 16, or the age set by that region).
- If we learn that we have collected personal information from a child under the applicable minimum age, we will delete it without undue delay. If a parent or guardian becomes aware of such a case, please contact us using the details below.

---

## 9. Data Protection Officer and Contact

For questions about data processing, to exercise your rights, or to file a complaint, please contact:

- Service name: Memsum
- Data protection officer / operator: [[Operator or business name]]
- Contact email: [[Support email address]]
- Policy URL: [[Privacy policy hosting URL]]

---

## 10. Changes to This Policy

We may update this Privacy Policy to reflect changes in law or the Service. For material changes, we will provide notice through the app or the policy page before the effective date. The updated Policy takes effect on the effective date above.

---

## Placeholders to fill in (must be finalized before release)

- [[Effective date YYYY-MM-DD]] — Policy effective date
- [[Last updated YYYY-MM-DD]] — Policy last updated date
- [[Operator or business name]] — Data protection officer (individual or business name)
- [[Support email address]] — Email for user inquiries and rights requests
- [[Privacy policy hosting URL]] — Public policy URL to enter during store submission

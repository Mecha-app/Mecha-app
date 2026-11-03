import type { Metadata } from "next";
import { LegalSection, LegalShell } from "@/components/Legal";

export const metadata: Metadata = {
  title: "Privacy Policy — MECHA",
  description: "How MECHA Technologies, Inc. collects, uses, and protects your information.",
};

/**
 * Route `/privacy` (blueprint route 10) — the company's published
 * Privacy Policy, carried verbatim from the legacy site
 * (repo frontend/src/pages/PrivacyPage.js, "Last updated: January 1,
 * 2026") into the rebuild's design system. Built in the dead-link
 * sweep: the footer linked here and the route did not exist.
 */
export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="Last updated: January 1, 2026">
      <LegalSection
        heading="1. Introduction"
        paragraphs={[
          "MECHA Technologies, Inc. operates the MECHA platform. This Privacy Policy explains how we collect, use, and protect your information.",
        ]}
      />
      <LegalSection
        heading="2. Information We Collect"
        items={[
          "Account info (name, email, password)",
          "Vehicle information (make, model, year, mileage)",
          "Diagnostic descriptions and photos",
          "Location data for mechanic/towing searches",
          "Messages with mechanics, shops, or other users",
        ]}
      />
      <LegalSection
        heading="3. How We Use Your Information"
        items={[
          "Provide AI-powered vehicle diagnostics",
          "Connect you with mechanics and towing services",
          "Send maintenance reminders and service alerts",
          "Improve our platform and services",
          "Comply with legal obligations",
        ]}
      />
      <LegalSection
        heading="4. Information Sharing"
        paragraphs={[
          "We do not sell your personal information. We may share data with service providers, mechanics when you request services, and law enforcement when required by law.",
        ]}
      />
      <LegalSection
        heading="5. Data Security"
        paragraphs={[
          "We use industry-standard encryption to protect your data in transit and at rest. Your car data is never sold to third parties.",
        ]}
      />
      <LegalSection
        heading="6. Your Rights"
        paragraphs={[
          "You may access, update, or delete your account at any time. Contact us at privacy@mechaai.com to exercise these rights.",
        ]}
      />
      <LegalSection
        heading="7. Cookies"
        paragraphs={[
          "We use cookies to improve your experience. You can control cookie settings through your browser preferences.",
        ]}
      />
      <LegalSection heading="8. Contact" paragraphs={["Questions? Email privacy@mechaai.com"]} />
    </LegalShell>
  );
}

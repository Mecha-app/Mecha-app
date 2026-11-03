import type { Metadata } from "next";
import { LegalSection, LegalShell } from "@/components/Legal";

export const metadata: Metadata = {
  title: "Terms of Service — MECHA",
  description: "The terms that govern use of the MECHA platform.",
};

/**
 * Route `/terms` (blueprint route 10) — the company's published Terms
 * of Service, carried verbatim from the legacy site (repo
 * frontend/src/pages/TermsPage.js, "Last updated: January 1, 2026")
 * into the rebuild's design system. Built in the dead-link sweep: the
 * footer linked here and the route did not exist.
 */
export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="Last updated: January 1, 2026">
      <LegalSection
        heading="1. Acceptance of Terms"
        paragraphs={[
          "By using MECHA you agree to these Terms of Service. If you do not agree, please do not use our Service.",
        ]}
      />
      <LegalSection
        heading="2. Description of Service"
        paragraphs={[
          "MECHA provides AI-powered vehicle diagnostics, repair cost estimates, mechanic finding, vehicle marketplace, and towing services. AI results are informational only and do not replace professional mechanical advice.",
        ]}
      />
      <LegalSection
        heading="3. User Accounts"
        items={[
          "You must be 18 or older to create an account",
          "You are responsible for your account security",
          "You must provide accurate information",
          "One person may not maintain multiple accounts",
        ]}
      />
      <LegalSection
        heading="4. AI Diagnostic Disclaimer"
        paragraphs={[
          "MECHA AI diagnostics are estimates based on information you provide. Always consult a certified mechanic before making repair decisions. MECHA is not liable for damage resulting from AI diagnostic results.",
        ]}
      />
      <LegalSection
        heading="5. Marketplace Rules"
        items={[
          "All listings must be accurate and truthful",
          "Sellers must disclose all known defects",
          "MECHA is not a party to buyer-seller transactions",
          "Fraudulent listings result in immediate termination",
        ]}
      />
      <LegalSection
        heading="6. Prohibited Uses"
        items={[
          "Using the platform for illegal purposes",
          "Posting false or misleading information",
          "Harassing other users",
          "Attempting to hack or disrupt the platform",
        ]}
      />
      <LegalSection
        heading="7. Limitation of Liability"
        paragraphs={[
          "MECHA shall not be liable for indirect or consequential damages. Our total liability shall not exceed amounts paid in the past 12 months.",
        ]}
      />
      <LegalSection
        heading="8. Governing Law"
        paragraphs={[
          "These terms are governed by Florida law. Disputes resolved in Miami-Dade County courts.",
        ]}
      />
      <LegalSection heading="9. Contact" paragraphs={["Questions? Email legal@mechaai.com"]} />
    </LegalShell>
  );
}

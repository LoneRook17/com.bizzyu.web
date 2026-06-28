import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Bizzy SMS Marketing Opt-In",
  description:
    "Documentation of Bizzy's SMS marketing opt-in consent flow for A2P 10DLC carrier campaign verification. Users opt in to receive recurring marketing texts from Bizzy about event offers, ticket offers, line-skip offers, and limited-time event promotions. Shows the phone number field, unchecked consent checkbox, exact consent language, and confirmation screen.",
  alternates: { canonical: "/sms-opt-in-proof" },
};

// Exact consent language as it appears next to the opt-in checkbox in the app.
// Matches the Bizzy A2P 10DLC Marketing campaign submission word-for-word.
const CONSENT_TEXT =
  "I agree to receive recurring marketing text messages from Bizzy about event offers, ticket offers, line-skip offers, and limited-time event promotions. Message frequency varies. Msg & data rates may apply. Reply STOP to unsubscribe and HELP for help. Consent is not required to make a purchase.";

const SAMPLE_NUMBER = "(305) 555-0142";

const GREEN_GRADIENT =
  "linear-gradient(135deg, #2ECB4E 0%, #05EB54 100%)";

/* ----------------------------- Phone chrome ----------------------------- */

function PhoneFrame({
  children,
  label,
  step,
}: {
  children: React.ReactNode;
  label: string;
  step: string;
}) {
  return (
    <figure className="flex flex-col items-center">
      <div className="relative w-[300px] rounded-[2.75rem] border-[10px] border-ink bg-ink shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 z-10 h-[26px] w-[120px] -translate-x-1/2 rounded-b-2xl bg-ink" />
        {/* Screen */}
        <div className="relative flex h-[664px] flex-col overflow-hidden rounded-[2rem] bg-white">
          <StatusBar />
          <div className="flex flex-1 flex-col px-6 pb-6 pt-2">{children}</div>
        </div>
      </div>
      <figcaption className="mt-5 max-w-[300px] text-center">
        <span className="inline-block rounded-full bg-primary-light px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink">
          {step}
        </span>
        <p className="mt-2 text-sm font-medium text-muted">{label}</p>
      </figcaption>
    </figure>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pt-4 text-[13px] font-semibold text-ink">
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        {/* signal */}
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden>
          <rect x="0" y="8" width="3" height="4" rx="1" fill="#030303" />
          <rect x="5" y="5" width="3" height="7" rx="1" fill="#030303" />
          <rect x="10" y="2.5" width="3" height="9.5" rx="1" fill="#030303" />
          <rect x="15" y="0" width="3" height="12" rx="1" fill="#030303" />
        </svg>
        {/* battery */}
        <svg width="26" height="13" viewBox="0 0 26 13" fill="none" aria-hidden>
          <rect
            x="0.5"
            y="0.5"
            width="22"
            height="12"
            rx="3"
            stroke="#030303"
            opacity="0.4"
          />
          <rect x="2.5" y="2.5" width="16" height="8" rx="1.5" fill="#030303" />
          <rect x="24" y="4" width="2" height="5" rx="1" fill="#030303" opacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

function ProgressDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 rounded-full transition-all"
          style={{
            width: i === current ? 24 : 8,
            backgroundColor: i === current ? "#05EB54" : "#E2E5E3",
          }}
        />
      ))}
    </div>
  );
}

function BizzyMark() {
  return (
    <div className="flex items-center justify-center pt-3">
      <Image
        src="/images/bizzy-logo.png"
        alt="Bizzy"
        width={92}
        height={30}
        className="h-7 w-auto object-contain"
      />
    </div>
  );
}

/* Unchecked checkbox - rendered as an empty square to make the default
   (un-selected) state unmistakable for carrier review. */
function EmptyCheckbox() {
  return (
    <span
      aria-hidden
      className="mt-0.5 block h-5 w-5 shrink-0 rounded-[6px] border-2 border-[#C9CFCB] bg-white"
    />
  );
}

function GreenButton({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-[54px] w-full items-center justify-center rounded-[14px] text-base font-bold text-white"
      style={{
        background: GREEN_GRADIENT,
        boxShadow: "0 4px 14px rgba(5, 235, 84, 0.35)",
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------- Screens -------------------------------- */

function ScreenPhoneAndConsent() {
  return (
    <>
      <BizzyMark />
      <ProgressDots current={0} />
      <div className="pt-6">
        <h3 className="text-[22px] font-extrabold leading-tight text-ink">
          Bizzy SMS Marketing Opt-In
        </h3>
        <p className="mt-1.5 text-[13px] leading-snug text-muted">
          Enter your phone number and opt in to get Bizzy event offers, ticket
          offers, and line-skip promotions by text.
        </p>
      </div>

      {/* Phone number field */}
      <div className="pt-5">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Phone number
        </label>
        <div className="mt-1.5 flex h-[52px] items-center rounded-[14px] border-2 border-[#E5E7EB] px-4">
          <span className="text-base font-medium text-muted">🇺🇸 +1</span>
          <span className="mx-3 h-6 w-px bg-[#E5E7EB]" />
          <span className="text-base font-semibold text-ink">
            {SAMPLE_NUMBER}
          </span>
        </div>
      </div>

      {/* Unchecked SMS marketing consent checkbox + exact consent language */}
      <div className="mt-4 flex gap-2.5 rounded-[14px] bg-[#F7FAF8] p-3">
        <EmptyCheckbox />
        <p className="text-[10.5px] leading-[1.45] text-[#4A524D]">
          I agree to receive recurring marketing text messages from{" "}
          <span className="font-semibold">Bizzy</span> about event offers, ticket
          offers, line-skip offers, and limited-time event promotions. Message
          frequency varies. Msg &amp; data rates may apply. Reply{" "}
          <span className="font-bold">STOP</span> to unsubscribe and{" "}
          <span className="font-bold">HELP</span> for help. Consent is not
          required to make a purchase.
        </p>
      </div>

      {/* Terms / Privacy links - shown beside the form, not burying consent */}
      <p className="mt-2 pl-1 text-[10.5px] leading-snug text-muted">
        <span className="font-semibold text-[#05A33B] underline">Terms</span>
        {" · "}
        <span className="font-semibold text-[#05A33B] underline">
          Privacy Policy
        </span>
      </p>

      <div className="flex-1" />

      {/* Continue button */}
      <GreenButton>Continue</GreenButton>
      <p className="pt-3 text-center text-[13px] font-medium text-muted">Back</p>
    </>
  );
}

function ScreenVerify() {
  const code = ["3", "9", "1", "•", "•", "•"];
  return (
    <>
      <BizzyMark />
      <ProgressDots current={1} />
      <div className="pt-6">
        <h3 className="text-[22px] font-extrabold leading-tight text-ink">
          Verify your number
        </h3>
        <p className="mt-1.5 text-[13px] leading-snug text-muted">
          Enter the 6-digit code we texted to{" "}
          <span className="font-semibold text-ink">{SAMPLE_NUMBER}</span>.
        </p>
      </div>

      <div className="flex justify-between gap-2 pt-7">
        {code.map((c, i) => (
          <div
            key={i}
            className="flex h-[52px] w-[40px] items-center justify-center rounded-[12px] border-2 text-xl font-bold text-ink"
            style={{
              borderColor: c === "•" ? "#E5E7EB" : "#05EB54",
              color: c === "•" ? "#C9CFCB" : "#030303",
            }}
          >
            {c}
          </div>
        ))}
      </div>

      <p className="pt-5 text-center text-[12px] text-muted">
        Didn&apos;t get a code?{" "}
        <span className="font-semibold text-[#05A33B]">Resend</span>
      </p>

      <div className="flex-1" />
      <GreenButton>Verify</GreenButton>
      <p className="pt-3 text-center text-[13px] font-medium text-muted">Back</p>
    </>
  );
}

function ScreenConfirmation() {
  return (
    <>
      <BizzyMark />
      <ProgressDots current={2} />
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: GREEN_GRADIENT }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 13l4 4L19 7"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 className="pt-5 text-[22px] font-extrabold text-ink">
          You&apos;re all set!
        </h3>
        <p className="mt-2 px-2 text-[13px] leading-relaxed text-muted">
          Your number{" "}
          <span className="font-semibold text-ink">{SAMPLE_NUMBER}</span> is
          verified and you&apos;ve opted in to Bizzy marketing texts.
        </p>
        <div className="mt-4 rounded-[14px] bg-[#F7FAF8] px-4 py-3">
          <p className="text-[11.5px] leading-relaxed text-[#4A524D]">
            You&apos;ll receive recurring marketing texts about event offers,
            ticket offers, line-skip offers, and limited-time event promotions.
            Reply <span className="font-bold">STOP</span> anytime to unsubscribe
            or <span className="font-bold">HELP</span> for help. Msg &amp; data
            rates may apply.
          </p>
        </div>
      </div>
      <GreenButton>Continue to Bizzy</GreenButton>
    </>
  );
}

/* -------------------------------- Page ---------------------------------- */

export default function SmsOptInProofPage() {
  return (
    <div className="bg-white">
      {/* Header */}
      <section className="border-b border-[#ECECEC] bg-[#FAFCFB]">
        <div className="mx-auto max-w-5xl px-6 py-14 text-center">
          <span className="inline-block rounded-full border border-primary/30 bg-primary-light px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink">
            SMS / A2P 10DLC Marketing Opt-In
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Bizzy SMS Marketing Opt-In
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted">
            This page documents how users opt in to receive recurring{" "}
            <span className="font-semibold text-ink">marketing</span> text
            messages from <span className="font-semibold text-ink">Bizzy</span>{" "}
            about event offers, ticket offers, line-skip offers, and limited-time
            event promotions. It shows the in-app opt-in form: the phone number
            field, the unchecked consent checkbox, the exact consent language,
            the submit action, and the confirmation screen.
          </p>
        </div>
      </section>

      {/* Phone flow */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-ink">
          The opt-in flow, screen by screen
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted">
          A new user enters their phone number, reviews the marketing consent
          disclosure (checkbox is{" "}
          <span className="font-semibold">unchecked by default</span>), verifies
          via one-time passcode, and lands on a confirmation screen.
        </p>

        <div className="mt-12 flex flex-wrap items-start justify-center gap-10 lg:gap-12">
          <PhoneFrame step="Step 1 of 3" label="Marketing opt-in: phone number field, unchecked SMS consent checkbox, exact consent language, and Continue button">
            <ScreenPhoneAndConsent />
          </PhoneFrame>
          <PhoneFrame step="Step 2 of 3" label="One-time passcode verification of the mobile number entered">
            <ScreenVerify />
          </PhoneFrame>
          <PhoneFrame step="Step 3 of 3" label="Confirmation screen, number verified and opt-in confirmed, with STOP/HELP reminder">
            <ScreenConfirmation />
          </PhoneFrame>
        </div>
      </section>

      {/* Compliance checklist + verbatim consent */}
      <section className="border-t border-[#ECECEC] bg-[#FAFCFB]">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-2xl font-bold text-ink">
            What this flow demonstrates
          </h2>
          <ul className="mt-6 space-y-3">
            {[
              "The opt-in form presents a dedicated phone number field, branded with the Bizzy business name.",
              "The SMS marketing consent checkbox is unchecked by default. Opt-in requires an affirmative action by the user.",
              "Consent applies only to Bizzy marketing texts (event offers, ticket offers, line-skip offers, and limited-time event promotions). It is not shared with any other use case.",
              "The full, exact consent language is shown next to the checkbox before the user proceeds. It is not buried inside the Terms or Privacy Policy.",
              "A clear Continue / submit action follows the consent disclosure, and a confirmation screen confirms the opt-in with STOP/HELP instructions.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ background: GREEN_GRADIENT }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-sm leading-relaxed text-[#3A413C]">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          {/* Verbatim consent text */}
          <div className="mt-10">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Exact consent language
            </h3>
            <blockquote className="mt-3 rounded-2xl border border-primary/25 bg-white p-5 text-[15px] leading-relaxed text-ink shadow-sm">
              &ldquo;{CONSENT_TEXT}&rdquo;
            </blockquote>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Program: <span className="font-semibold text-ink">Bizzy</span>,
              recurring marketing texts about event offers, ticket offers,
              line-skip offers, and limited-time event promotions. Message
              frequency varies. Msg &amp; data rates may apply. Reply{" "}
              <span className="font-semibold text-ink">STOP</span> to unsubscribe
              and <span className="font-semibold text-ink">HELP</span> for help.
              Full details are in our{" "}
              <Link href="/terms" className="font-semibold text-[#05A33B] underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-semibold text-[#05A33B] underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

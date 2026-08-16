"use client";

import { useState } from "react";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import TurnstileWidget from "@/components/ui/TurnstileWidget";
import { CAMPUSES, CONTACT_EMAIL } from "@/lib/constants";

function ApplicationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      school: (form.elements.namedItem("school") as HTMLSelectElement).value,
      role: (form.elements.namedItem("role") as HTMLSelectElement).value,
      social: (form.elements.namedItem("social") as HTMLInputElement).value,
      about: (form.elements.namedItem("about") as HTMLTextAreaElement).value,
      website_url: (form.elements.namedItem("website_url") as HTMLInputElement).value,
      turnstileToken,
    };

    try {
      const res = await fetch("/api/street-interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to send");
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again or email us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {submitted ? (
        <div className="bg-primary-light rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-ink mb-2">
            Application sent!
          </h3>
          <p className="text-muted">
            Thanks for applying. We&apos;ll reach out soon with next steps.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-5"
        >
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">
              Name
            </label>
            <input
              type="text"
              id="name"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
              Email
            </label>
            <input
              type="email"
              id="email"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="school" className="block text-sm font-medium text-ink mb-1.5">
              Your school
            </label>
            <select
              id="school"
              required
              defaultValue=""
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            >
              <option value="" disabled>
                Select your school
              </option>
              {CAMPUSES.map((campus) => (
                <option key={campus.name} value={campus.name}>
                  {campus.name} ({campus.location})
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-ink mb-1.5">
              What do you want to do?
            </label>
            <select
              id="role"
              required
              defaultValue=""
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            >
              <option value="" disabled>
                Select one
              </option>
              <option value="Film only ($100 per interview)">
                Film interviews ($100 per interview)
              </option>
              <option value="Film + edit ($150 per interview)">
                Film and edit ($150 per interview)
              </option>
            </select>
          </div>

          <div>
            <label htmlFor="social" className="block text-sm font-medium text-ink mb-1.5">
              Instagram or TikTok
            </label>
            <input
              type="text"
              id="social"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              placeholder="@yourhandle"
            />
          </div>

          <div>
            <label htmlFor="about" className="block text-sm font-medium text-ink mb-1.5">
              Anything we should see?{" "}
              <span className="text-muted font-normal">(optional)</span>
            </label>
            <textarea
              id="about"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
              placeholder="Links to videos you've made, past experience, or anything else..."
            />
          </div>

          {/* Honeypot - humans never see this, bots fill every field */}
          <input
            type="text"
            name="website_url"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />

          <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-primary text-white font-semibold rounded-full hover:brightness-110 transition-all shadow-lg shadow-primary/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Sending..." : "Apply Now"}
          </button>

          <p className="text-center text-muted text-sm">
            Questions? Email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary font-medium hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </form>
      )}
    </div>
  );
}

export default function StreetInterviewsPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-primary-light">
        <SectionContainer className="py-20 md:py-32">
          <AnimatedSection>
            <div className="max-w-2xl mx-auto text-center mb-12">
              <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
                Now Hiring Creators
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-ink leading-tight mb-4">
                Get paid to film street interviews
              </h1>
              <p className="text-lg text-muted">
                Grab a mic, ask students fun questions around campus, and get
                paid for every interview you make for Bizzy.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <div className="max-w-lg mx-auto grid grid-cols-2 gap-4 mb-12">
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">
                  $100
                </p>
                <p className="text-ink font-semibold">per interview</p>
                <p className="text-muted text-sm mt-1">
                  You film it, we edit it
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">
                  $150
                </p>
                <p className="text-ink font-semibold">per interview</p>
                <p className="text-muted text-sm mt-1">
                  You film and edit it
                </p>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <ApplicationForm />
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-primary to-emerald-500">
        <SectionContainer className="text-center py-16 md:py-20">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Haven&apos;t tried Bizzy yet?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              Download the app to see the deals and events students are talking
              about on your campus.
            </p>
            <a
              href="/"
              className="inline-flex items-center px-8 py-4 bg-white text-primary text-lg font-semibold rounded-full hover:bg-gray-50 transition-all shadow-lg"
            >
              Check Out Bizzy
            </a>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}

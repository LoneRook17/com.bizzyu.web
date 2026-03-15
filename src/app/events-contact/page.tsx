"use client";

import { useState } from "react";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { CONTACT_EMAIL } from "@/lib/constants";

export default function EventsContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const form = e.currentTarget;
    const data = {
      venueName: (form.elements.namedItem("venue-name") as HTMLInputElement).value,
      contactName: (form.elements.namedItem("contact-name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      venueType: (form.elements.namedItem("venue-type") as HTMLSelectElement).value,
      eventTypes: (form.elements.namedItem("event-types") as HTMLInputElement).value,
      frequency: (form.elements.namedItem("frequency") as HTMLSelectElement).value,
      details: (form.elements.namedItem("details") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/events-contact", {
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
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-primary-light">
        <SectionContainer className="py-20 md:py-32">
          <AnimatedSection>
            <div className="max-w-2xl mx-auto text-center mb-12">
              <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
                Events on Bizzy
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-ink leading-tight mb-4">
                Get your events in front of{" "}
                <span className="text-primary">thousands of students</span>
              </h1>
              <p className="text-lg text-muted max-w-xl mx-auto">
                List your events on Bizzy, sell tickets in-app, and accept
                payments at the door with Tap to Pay. Keep 100% of your
                proceeds - powered by Stripe.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <div className="max-w-lg mx-auto">
              {submitted ? (
                <div className="bg-primary-light rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-ink mb-2">
                    We&apos;ll be in touch!
                  </h3>
                  <p className="text-muted">
                    Our events team will reach out shortly to get you set up.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-5"
                >
                  <div>
                    <label htmlFor="venue-name" className="block text-sm font-medium text-ink mb-1.5">
                      Venue / Business Name
                    </label>
                    <input
                      type="text"
                      id="venue-name"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="e.g. The Tap Room"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium text-ink mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="contact-name"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="Your full name"
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
                    <label htmlFor="phone" className="block text-sm font-medium text-ink mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="(555) 555-5555"
                    />
                  </div>

                  <div>
                    <label htmlFor="venue-type" className="block text-sm font-medium text-ink mb-1.5">
                      What type of venue are you?
                    </label>
                    <select
                      id="venue-type"
                      required
                      defaultValue=""
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    >
                      <option value="" disabled>Select one</option>
                      <option value="college-bar">College Bar</option>
                      <option value="nightclub">Nightclub / Lounge</option>
                      <option value="restaurant">Restaurant / Eatery</option>
                      <option value="event-venue">Event Venue / Hall</option>
                      <option value="student-org">Student Organization</option>
                      <option value="promoter">Event Promoter</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="event-types" className="block text-sm font-medium text-ink mb-1.5">
                      What kind of events do you host?
                    </label>
                    <input
                      type="text"
                      id="event-types"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="e.g. College nights, DJ sets, trivia, open mic"
                    />
                  </div>

                  <div>
                    <label htmlFor="frequency" className="block text-sm font-medium text-ink mb-1.5">
                      How often do you host events?
                    </label>
                    <select
                      id="frequency"
                      required
                      defaultValue=""
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    >
                      <option value="" disabled>Select one</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every other week</option>
                      <option value="monthly">Monthly</option>
                      <option value="occasionally">Occasionally</option>
                      <option value="first-time">Planning our first one</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="details" className="block text-sm font-medium text-ink mb-1.5">
                      Anything else we should know?
                    </label>
                    <textarea
                      id="details"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                      placeholder="Tell us about your venue, your audience, or what you're looking for..."
                    />
                  </div>

                  {error && (
                    <p className="text-red-500 text-sm text-center">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] text-white font-semibold rounded-full hover:brightness-110 transition-all shadow-lg shadow-primary/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Sending..." : "Contact Events Team"}
                  </button>

                  <p className="text-center text-muted text-sm">
                    Or email us directly at{" "}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary font-medium hover:underline">
                      {CONTACT_EMAIL}
                    </a>
                  </p>
                </form>
              )}
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}

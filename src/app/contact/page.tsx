"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { CONTACT_EMAIL } from "@/lib/constants";

function ContactForm() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const [submitted, setSubmitted] = useState(false);

  const defaultType =
    typeParam === "business"
      ? "business"
      : typeParam === "student"
        ? "student"
        : "";

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
            Message sent!
          </h3>
          <p className="text-muted">
            Thanks for reaching out. We&apos;ll get back to you soon.
          </p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
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
            <label htmlFor="type" className="block text-sm font-medium text-ink mb-1.5">
              I am a...
            </label>
            <select
              id="type"
              required
              defaultValue={defaultType}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            >
              <option value="">Select one</option>
              <option value="student">Student</option>
              <option value="business">Business Owner</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-ink mb-1.5">
              Message
            </label>
            <textarea
              id="message"
              required
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
              placeholder="Tell us what's on your mind..."
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-primary text-white font-semibold rounded-full hover:brightness-110 transition-all shadow-lg shadow-primary/25 cursor-pointer"
          >
            Send Message
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
  );
}

export default function ContactPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-primary-light">
        <SectionContainer className="py-20 md:py-32">
          <AnimatedSection>
            <div className="max-w-2xl mx-auto text-center mb-12">
              <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
                Get in Touch
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-ink leading-tight mb-4">
                Let&apos;s talk
              </h1>
              <p className="text-lg text-muted">
                Whether you&apos;re a student with feedback, a business looking to
                join, or just curious - we&apos;d love to hear from you.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <Suspense fallback={<div className="max-w-lg mx-auto h-96" />}>
              <ContactForm />
            </Suspense>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-primary to-emerald-500">
        <SectionContainer className="text-center py-16 md:py-20">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Looking to list your business?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              Get your deals in front of thousands of college students - completely free.
            </p>
            <a
              href="/signup"
              className="inline-flex items-center px-8 py-4 bg-white text-primary text-lg font-semibold rounded-full hover:bg-gray-50 transition-all shadow-lg"
            >
              Get Started Free
            </a>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}

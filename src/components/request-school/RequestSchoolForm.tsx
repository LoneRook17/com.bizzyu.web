"use client";

import { useState } from "react";
import TurnstileWidget from "@/components/ui/TurnstileWidget";
import { CONTACT_EMAIL } from "@/lib/constants";
import {
  CATALOG_API_GAP_NOTE,
  REQUEST_SCHOOL_API_PATH,
  REQUEST_SCHOOL_BLURB,
} from "@/lib/request-school";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";

export default function RequestSchoolForm({
  initialSchool = "",
  compact = false,
}: {
  initialSchool?: string;
  compact?: boolean;
}) {
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
      school: (form.elements.namedItem("school") as HTMLInputElement).value,
      role: (form.elements.namedItem("role") as HTMLSelectElement).value,
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value,
      website_url: (form.elements.namedItem("website_url") as HTMLInputElement).value,
      turnstileToken,
    };

    try {
      const res = await fetch(REQUEST_SCHOOL_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(typeof body.error === "string" ? body.error : "Failed to send");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Email us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-primary-light rounded-2xl p-8 text-center">
        <h3 className="text-2xl font-bold text-ink mb-2">Request received</h3>
        <p className="text-muted">
          Thanks. Your school is on the review list. New campuses go live when the team adds them
          to the catalog.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 space-y-5 ${compact ? "p-6" : "p-8"}`}
    >
      {!compact && <p className="text-sm text-muted">{REQUEST_SCHOOL_BLURB}</p>}

      <div>
        <label htmlFor="school" className="block text-sm font-medium text-ink mb-1.5">
          School
        </label>
        <input
          id="school"
          name="school"
          required
          defaultValue={initialSchool}
          className={inputClass}
          placeholder="University of Iowa"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">
            Your name
          </label>
          <input id="name" name="name" required className={inputClass} placeholder="Jordan Lee" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={inputClass}
            placeholder="you@school.edu"
          />
        </div>
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-ink mb-1.5">
          I am a...
        </label>
        <select id="role" name="role" required defaultValue="student" className={inputClass}>
          <option value="student">Student</option>
          <option value="business">Business owner</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-ink mb-1.5">
          Anything else <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className={`${inputClass} resize-none`}
          placeholder="Campus town, bars you want, or how you heard about Bizzy"
        />
      </div>

      <input
        type="text"
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 bg-primary text-ink font-semibold rounded-full hover:brightness-110 transition-all shadow-lg shadow-primary/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Sending..." : "Request this school"}
      </button>

      <p className="text-center text-muted text-xs leading-relaxed">
        {CATALOG_API_GAP_NOTE} Or email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-dark font-medium hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </form>
  );
}

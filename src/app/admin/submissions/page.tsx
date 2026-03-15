"use client";

import { useEffect, useState, useCallback } from "react";
import type { Submission } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  live: "bg-green-100 text-green-800",
};

const STATUSES = ["pending", "approved", "rejected", "live"] as const;

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    const res = await fetch("/api/submissions");
    const data = await res.json();
    setSubmissions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchSubmissions();
  };

  const filtered =
    filter === "all"
      ? submissions
      : submissions.filter((s) => s.status === filter);

  if (loading) {
    return (
      <main className="min-h-screen pt-24 px-4">
        <div className="max-w-5xl mx-auto text-center text-muted">
          Loading submissions...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-ink mb-2">
          Deal Submissions
        </h1>
        <p className="text-muted mb-6">
          {submissions.length} total submission{submissions.length !== 1 && "s"}
        </p>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                filter === s
                  ? "bg-ink text-white"
                  : "bg-gray-100 text-muted hover:bg-gray-200"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s !== "all" && (
                <span className="ml-1.5 opacity-60">
                  ({submissions.filter((sub) => s === "all" || sub.status === s).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center text-muted py-16 bg-gray-50 rounded-2xl">
            No {filter === "all" ? "" : filter} submissions yet.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((sub) => (
              <div
                key={sub.id}
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
              >
                {/* Row */}
                <button
                  onClick={() =>
                    setExpandedId(expandedId === sub.id ? null : sub.id)
                  }
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                        STATUS_COLORS[sub.status]
                      }`}
                    >
                      {sub.status}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">
                        {sub.deal.title}
                      </p>
                      <p className="text-sm text-muted truncate">
                        {sub.business.businessName} &mdash;{" "}
                        {sub.business.email}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap ml-4">
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </span>
                </button>

                {/* Expanded detail */}
                {expandedId === sub.id && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-bold text-ink mb-2">Business</h4>
                        <p>{sub.business.businessName}</p>
                        <p>{sub.business.contactName}</p>
                        <p>{sub.business.email}</p>
                        <p>{sub.business.phone}</p>
                        <p>{sub.business.address}</p>
                        {sub.business.campus && <p>Campus: {sub.business.campus}</p>}
                      </div>
                      <div>
                        <h4 className="font-bold text-ink mb-2">Deal</h4>
                        <p className="font-medium">{sub.deal.title}</p>
                        <p className="text-muted">{sub.deal.description}</p>
                        <p>Category: {sub.deal.category}</p>
                        <p>Frequency: {sub.deal.redemptionFrequency}</p>
                        {sub.deal.limitedSupplyCount && (
                          <p>Supply: {sub.deal.limitedSupplyCount} claims</p>
                        )}
                        {sub.deal.startDate && <p>Start: {sub.deal.startDate}</p>}
                        {sub.deal.endDate && <p>End: {sub.deal.endDate}</p>}
                      </div>
                    </div>

                    {/* Status controls */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                      {STATUSES.map((status) => (
                        <button
                          key={status}
                          onClick={() => updateStatus(sub.id, status)}
                          disabled={sub.status === status}
                          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                            STATUS_COLORS[status]
                          } hover:brightness-95`}
                        >
                          {status === "live"
                            ? "Go Live"
                            : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DisplayStatus } from "@/types";
import { formatPrice, formatDateTime } from "@/lib/sessions";

interface SessionResult {
  id: string;
  plateNumber: string;
  carMake: string;
  email: string;
  passType: string;
  status: string;
  displayStatus: DisplayStatus;
  tariffName: string;
  tariffPriceAmount: number;
  tariffCurrency: string;
  startTime: string | null;
  endTime: string | null;
  stripeCheckoutSessionId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

interface SearchResult {
  found: boolean;
  plate: string;
  sessions: SessionResult[];
}

const STATUS_STYLES: Record<DisplayStatus, { bg: string; text: string; label: string }> = {
  ACTIVE: { bg: "bg-green-100", text: "text-green-800", label: "ACTIVE" },
  EXPIRED: { bg: "bg-gray-100", text: "text-gray-800", label: "EXPIRED" },
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", label: "PENDING" },
  REFUNDED: { bg: "bg-red-100", text: "text-red-800", label: "REFUNDED" },
};

export default function AdminVerifyPage() {
  const router = useRouter();
  const [plate, setPlate] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!plate.trim()) {
      setError("Enter a plate number");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/admin/session?plate=${encodeURIComponent(plate.trim())}`
      );

      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  const getActiveSession = (sessions: SessionResult[]): SessionResult | null => {
    return sessions.find((s) => s.displayStatus === "ACTIVE") || null;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Verify Parking</h1>
            <p className="text-sm text-gray-600">Check if a vehicle has a valid pass</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/pricing"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Pricing
            </a>
            <a
              href="/admin/users"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Users
            </a>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="Enter plate number"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase text-lg font-mono"
              autoComplete="off"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {isLoading ? "..." : "Search"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-6">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Quick Status Card */}
            {!result.found ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-1">NOT FOUND</p>
                <p className="text-gray-600">
                  No records for plate{" "}
                  <span className="font-mono font-medium">{result.plate}</span>
                </p>
              </div>
            ) : (
              <>
                {/* Active Pass Quick View */}
                {(() => {
                  const activeSession = getActiveSession(result.sessions);
                  if (activeSession) {
                    return (
                      <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-2xl font-bold text-green-700">
                            VALID
                          </span>
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            {activeSession.passType}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Plate</span>
                            <span className="font-mono font-medium">
                              {activeSession.plateNumber}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Vehicle</span>
                            <span className="font-medium">{activeSession.carMake}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Valid Until</span>
                            <span className="font-medium">
                              {activeSession.endTime
                                ? formatDateTime(new Date(activeSession.endTime))
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // No active pass
                  const latestSession = result.sessions[0];
                  return (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-bold text-red-700">
                          {latestSession.displayStatus}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            STATUS_STYLES[latestSession.displayStatus as DisplayStatus]?.bg
                          } ${STATUS_STYLES[latestSession.displayStatus as DisplayStatus]?.text}`}
                        >
                          {latestSession.passType}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Plate</span>
                          <span className="font-mono font-medium">
                            {latestSession.plateNumber}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vehicle</span>
                          <span className="font-medium">{latestSession.carMake}</span>
                        </div>
                        {latestSession.endTime && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              {latestSession.displayStatus === "EXPIRED"
                                ? "Expired"
                                : "End Time"}
                            </span>
                            <span className="font-medium">
                              {formatDateTime(new Date(latestSession.endTime))}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Session History */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h2 className="font-medium text-gray-900">Session History</h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {result.sessions.map((session) => (
                      <div key={session.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              STATUS_STYLES[session.displayStatus]?.bg
                            } ${STATUS_STYLES[session.displayStatus]?.text}`}
                          >
                            {session.displayStatus}
                          </span>
                          <span className="text-sm text-gray-500">
                            {session.tariffName}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Start:</span>{" "}
                            <span className="text-gray-900">
                              {session.startTime
                                ? formatDateTime(new Date(session.startTime))
                                : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">End:</span>{" "}
                            <span className="text-gray-900">
                              {session.endTime
                                ? formatDateTime(new Date(session.endTime))
                                : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Paid:</span>{" "}
                            <span className="text-gray-900">
                              {formatPrice(
                                session.tariffPriceAmount,
                                session.tariffCurrency
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Created:</span>{" "}
                            <span className="text-gray-900">
                              {formatDateTime(new Date(session.createdAt))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

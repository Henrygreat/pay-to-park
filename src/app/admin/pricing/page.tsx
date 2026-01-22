"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/sessions";

interface Tariff {
  passType: string;
  name: string;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
  isActive: boolean;
  isRecommended: boolean;
}

const DURATION_LABELS: Record<number, string> = {
  1440: "24 hours",
  10080: "7 days",
  43200: "30 days",
};

export default function AdminPricingPage() {
  const router = useRouter();
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdmin = role === "ADMIN";

  const fetchTariffs = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/tariffs");

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await response.json();
      setTariffs(data.tariffs);
      setRole(data.role);
    } catch {
      setError("Failed to load tariffs");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTariffs();
  }, [fetchTariffs]);

  const handleUpdate = async (passType: string, updates: Partial<Tariff>) => {
    if (!isAdmin) return;

    const tariff = tariffs.find((t) => t.passType === passType);
    if (!tariff) return;

    setSaving(passType);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/tariffs/${passType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceAmount: updates.priceAmount ?? tariff.priceAmount,
          currency: updates.currency ?? tariff.currency,
          isActive: updates.isActive ?? tariff.isActive,
          isRecommended: updates.isRecommended ?? tariff.isRecommended,
        }),
      });

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      if (response.status === 403) {
        setError("Admin role required to edit tariffs");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Update failed");
      }

      // Refresh tariffs to get updated state
      await fetchTariffs();
      setSuccess(`${passType} tariff updated`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(null);
    }
  };

  const handlePriceChange = (passType: string, value: string) => {
    const pence = Math.round(parseFloat(value) * 100) || 0;
    setTariffs((prev) =>
      prev.map((t) => (t.passType === passType ? { ...t, priceAmount: pence } : t))
    );
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Pricing</h1>
            <p className="text-sm text-gray-600">
              {isAdmin ? "Manage pass pricing" : "View pass pricing (read-only)"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/verify"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Verify
            </a>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Tariff Cards */}
        <div className="space-y-4">
          {tariffs.map((tariff) => (
            <div
              key={tariff.passType}
              className={`bg-white rounded-lg shadow p-4 ${
                !tariff.isActive ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">{tariff.name}</h2>
                  {tariff.isRecommended && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                      Recommended
                    </span>
                  )}
                  {!tariff.isActive && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      Disabled
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {DURATION_LABELS[tariff.durationMinutes] || `${tariff.durationMinutes} min`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Price Input */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Price ({tariff.currency.toUpperCase()})
                  </label>
                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">£</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={(tariff.priceAmount / 100).toFixed(2)}
                        onChange={(e) => handlePriceChange(tariff.passType, e.target.value)}
                        onBlur={() =>
                          handleUpdate(tariff.passType, { priceAmount: tariff.priceAmount })
                        }
                        className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        disabled={saving === tariff.passType}
                      />
                    </div>
                  ) : (
                    <p className="text-lg font-medium">
                      {formatPrice(tariff.priceAmount, tariff.currency)}
                    </p>
                  )}
                </div>

                {/* Current Display Price */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Display</label>
                  <p className="text-lg font-medium text-gray-900">
                    {formatPrice(tariff.priceAmount, tariff.currency)}
                  </p>
                </div>
              </div>

              {/* Toggles */}
              {isAdmin && (
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tariff.isActive}
                      onChange={(e) =>
                        handleUpdate(tariff.passType, { isActive: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      disabled={saving === tariff.passType}
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tariff.isRecommended}
                      onChange={(e) =>
                        handleUpdate(tariff.passType, { isRecommended: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      disabled={saving === tariff.passType}
                    />
                    <span className="text-sm text-gray-700">Recommended</span>
                  </label>

                  {saving === tariff.passType && (
                    <span className="text-sm text-gray-500">Saving...</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
          <p>
            <strong>Note:</strong> Pricing changes apply immediately to new checkouts.
            Existing active passes are not affected.
          </p>
        </div>
      </div>
    </div>
  );
}

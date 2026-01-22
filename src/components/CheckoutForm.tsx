"use client";

import { useState } from "react";
import { PassType } from "@prisma/client";
import { TariffDisplay } from "@/types";
import { formatPrice } from "@/lib/sessions";

interface CheckoutFormProps {
  tariffs: TariffDisplay[];
}

export default function CheckoutForm({ tariffs }: CheckoutFormProps) {
  const [plateNumber, setPlateNumber] = useState("");
  const [carMake, setCarMake] = useState("");
  const [email, setEmail] = useState("");
  const [selectedPassType, setSelectedPassType] = useState<PassType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sort tariffs: recommended first, then by price descending
  const sortedTariffs = [...tariffs].sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;
    return b.priceAmount - a.priceAmount;
  });

  const selectedTariff = tariffs.find((t) => t.passType === selectedPassType);

  // Calculate savings for monthly vs weekly
  const weeklyTariff = tariffs.find((t) => t.passType === "WEEKLY");
  const monthlyTariff = tariffs.find((t) => t.passType === "MONTHLY");
  const monthlySavings =
    weeklyTariff && monthlyTariff
      ? Math.round(weeklyTariff.priceAmount * 4.3 - monthlyTariff.priceAmount)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPassType) {
      setError("Please select a pass type");
      return;
    }

    if (!plateNumber.trim() || !carMake.trim() || !email.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber: plateNumber.toUpperCase().replace(/\s/g, ""),
          carMake: carMake.trim(),
          email: email.trim().toLowerCase(),
          passType: selectedPassType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  const getDurationLabel = (minutes: number): string => {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${minutes / 60} hours`;
    const days = minutes / 1440;
    if (days === 1) return "24 hours";
    if (days === 7) return "7 days";
    if (days === 30) return "30 days";
    return `${days} days`;
  };

  const isFormValid = selectedPassType && plateNumber.trim() && carMake.trim() && email.trim();

  return (
    <form onSubmit={handleSubmit}>
      <div className="lg:grid lg:grid-cols-5 lg:gap-8">
        {/* Left Column - Form */}
        <div className="lg:col-span-3 space-y-6">
          {/* Pass Selection Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Select your pass</h2>
            <p className="text-sm text-gray-500 mb-5">Choose the duration that works best for you</p>

            <div className="space-y-3">
              {sortedTariffs.map((tariff) => {
                const isSelected = selectedPassType === tariff.passType;
                const isMonthly = tariff.passType === "MONTHLY";
                const showSavings = isMonthly && monthlySavings > 0;

                return (
                  <button
                    key={tariff.id}
                    type="button"
                    onClick={() => setSelectedPassType(tariff.passType)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPassType(tariff.passType);
                      }
                    }}
                    className={`group relative w-full text-left p-4 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/60 shadow-md ring-1 ring-blue-600"
                        : isMonthly
                        ? "border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5"
                    }`}
                    aria-pressed={isSelected}
                  >
                    {/* Best Value Badge - Integrated */}
                    {tariff.isRecommended && (
                      <div className="absolute -top-px -right-px">
                        <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl shadow-sm">
                          Best value
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Radio indicator */}
                      <div
                        className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-600"
                            : "border-gray-300 group-hover:border-gray-400"
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h3 className={`font-semibold ${isMonthly ? "text-blue-900" : "text-gray-900"}`}>
                              {tariff.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                              Valid for {getDurationLabel(tariff.durationMinutes)}
                            </p>
                            {showSavings && (
                              <p className="text-xs font-medium text-emerald-600 mt-1">
                                Save {formatPrice(monthlySavings, tariff.currency)} vs weekly
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`text-xl font-bold ${isMonthly ? "text-blue-900" : "text-gray-900"}`}>
                              {formatPrice(tariff.priceAmount, tariff.currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vehicle Details Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Vehicle details</h2>
            <p className="text-sm text-gray-500 mb-5">Enter your vehicle information</p>

            <div className="space-y-4">
              <div>
                <label htmlFor="plateNumber" className="block text-sm font-medium text-gray-700 mb-1.5">
                  License Plate Number
                </label>
                <input
                  type="text"
                  id="plateNumber"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="AB12 CDE"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white uppercase text-base transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="carMake" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Car Make
                </label>
                <input
                  type="text"
                  id="carMake"
                  value={carMake}
                  onChange={(e) => setCarMake(e.target.value)}
                  placeholder="e.g. Ford, Toyota, BMW"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-base transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-base transition-colors"
                  required
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  We&apos;ll send your pass confirmation here
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column - Order Summary (Desktop) */}
        <div className="hidden lg:block lg:col-span-2">
          <div className="sticky top-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order summary</h2>

              {selectedTariff ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{selectedTariff.name}</p>
                      <p className="text-sm text-gray-500">
                        Valid for {getDurationLabel(selectedTariff.durationMinutes)}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatPrice(selectedTariff.priceAmount, selectedTariff.currency)}
                    </p>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-gray-900">
                        {formatPrice(selectedTariff.priceAmount, selectedTariff.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm">Select a pass to see summary</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="mt-6 w-full py-3.5 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md disabled:shadow-none"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Continue to payment"
                )}
              </button>

              {/* Trust Elements */}
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Secure checkout powered by Stripe</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            {selectedTariff ? (
              <>
                <div>
                  <p className="text-sm text-gray-600">{selectedTariff.name}</p>
                  <p className="text-xs text-gray-500">
                    {getDurationLabel(selectedTariff.durationMinutes)}
                  </p>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {formatPrice(selectedTariff.priceAmount, selectedTariff.currency)}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">Select a pass to continue</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className="w-full py-3.5 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              "Continue to payment"
            )}
          </button>

          <p className="text-xs text-center text-gray-500 mt-2 flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secure checkout powered by Stripe
          </p>
        </div>
      </div>

      {/* Spacer for mobile sticky bar */}
      <div className="lg:hidden h-36" />
    </form>
  );
}

import { PassType, SessionStatus } from "@prisma/client";

// Display status includes computed EXPIRED
export type DisplayStatus = SessionStatus | "EXPIRED";

// Pass with computed display status
export interface ParkingSessionWithStatus {
  id: string;
  plateNumber: string;
  carMake: string;
  email: string;
  passType: PassType;
  status: SessionStatus;
  displayStatus: DisplayStatus;
  tariffName: string;
  tariffPriceAmount: number;
  tariffCurrency: string;
  startTime: Date | null;
  endTime: Date | null;
  stripeCheckoutSessionId: string | null;
  stripeSubscriptionId: string | null;
  stripePaymentIntentId: string | null;
  stripeCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Tariff for display
export interface TariffDisplay {
  id: string;
  passType: PassType;
  name: string;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
  isActive: boolean;
  isRecommended: boolean;
}

// Checkout form data
export interface CheckoutFormData {
  plateNumber: string;
  carMake: string;
  email: string;
  passType: PassType;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pass duration constants (in minutes)
export const PASS_DURATIONS: Record<PassType, number> = {
  DAILY: 24 * 60,      // 1440 minutes = 24 hours
  WEEKLY: 7 * 24 * 60, // 10080 minutes = 7 days
  MONTHLY: 30 * 24 * 60, // 43200 minutes = 30 days
};

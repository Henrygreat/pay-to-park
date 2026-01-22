import { ParkingSession } from "@prisma/client";
import { DisplayStatus, ParkingSessionWithStatus } from "@/types";

/**
 * Compute the display status for a parking session.
 * EXPIRED is computed dynamically when status is ACTIVE and now() > end_time
 */
export function computeDisplayStatus(session: ParkingSession): DisplayStatus {
  if (session.status === "REFUNDED") return "REFUNDED";
  if (session.status === "PENDING") return "PENDING";

  // For ACTIVE status, check if expired
  if (session.status === "ACTIVE" && session.endTime) {
    if (new Date() > session.endTime) {
      return "EXPIRED";
    }
  }

  return "ACTIVE";
}

/**
 * Transform a ParkingSession to include computed displayStatus
 */
export function withDisplayStatus(session: ParkingSession): ParkingSessionWithStatus {
  return {
    ...session,
    displayStatus: computeDisplayStatus(session),
  };
}

/**
 * Transform multiple sessions
 */
export function withDisplayStatuses(sessions: ParkingSession[]): ParkingSessionWithStatus[] {
  return sessions.map(withDisplayStatus);
}

/**
 * Format price for display (pence to pounds)
 */
export function formatPrice(amountInPence: number, currency: string = "gbp"): string {
  const amount = amountInPence / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDateTime(date: Date | null): string {
  if (!date) return "N/A";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * Calculate end time from start time and duration in minutes
 */
export function calculateEndTime(startTime: Date, durationMinutes: number): Date {
  return new Date(startTime.getTime() + durationMinutes * 60 * 1000);
}

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { formatPrice, formatDateTime } from "@/lib/sessions";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

async function SuccessContent({ sessionId }: { sessionId: string | undefined }) {
  if (!sessionId) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h1>
        <p className="text-gray-600 mb-6">
          We couldn&apos;t find your checkout session. If you completed a payment,
          please check your email for confirmation.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Return Home
        </Link>
      </div>
    );
  }

  // Retrieve Stripe checkout session
  let stripeSession;
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-red-600"
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Session</h1>
        <p className="text-gray-600 mb-6">
          This checkout session is invalid or has expired.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Return Home
        </Link>
      </div>
    );
  }

  // Get parking session from our database
  const parkingSessionId = stripeSession.metadata?.parkingSessionId;
  const parkingSession = parkingSessionId
    ? await prisma.parkingSession.findUnique({
        where: { id: parkingSessionId },
      })
    : null;

  const isPaid = stripeSession.payment_status === "paid";

  return (
    <div className="text-center">
      <div
        className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
          isPaid ? "bg-green-100" : "bg-yellow-100"
        }`}
      >
        {isPaid ? (
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            className="w-8 h-8 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {isPaid ? "Payment Successful!" : "Processing Payment..."}
      </h1>

      <p className="text-gray-600 mb-6">
        {isPaid
          ? "Your parking pass has been activated."
          : "Your payment is being processed. You'll receive a confirmation email shortly."}
      </p>

      {parkingSession && isPaid && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
          <h2 className="font-semibold text-gray-900 mb-4">Pass Details</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">License Plate</dt>
              <dd className="font-medium text-gray-900">
                {parkingSession.plateNumber}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Vehicle</dt>
              <dd className="font-medium text-gray-900">
                {parkingSession.carMake}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Pass Type</dt>
              <dd className="font-medium text-gray-900">
                {parkingSession.tariffName}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Amount Paid</dt>
              <dd className="font-medium text-gray-900">
                {formatPrice(
                  parkingSession.tariffPriceAmount,
                  parkingSession.tariffCurrency
                )}
              </dd>
            </div>
            {parkingSession.startTime && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Valid From</dt>
                <dd className="font-medium text-gray-900">
                  {formatDateTime(parkingSession.startTime)}
                </dd>
              </div>
            )}
            {parkingSession.endTime && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Valid Until</dt>
                <dd className="font-medium text-gray-900">
                  {formatDateTime(parkingSession.endTime)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-6">
        A confirmation email has been sent to{" "}
        <span className="font-medium">{stripeSession.customer_email}</span>
      </p>

      <Link
        href="/"
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Purchase Another Pass
      </Link>
    </div>
  );
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { session_id } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <Suspense
            fallback={
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-600">Loading...</p>
              </div>
            }
          >
            <SuccessContent sessionId={session_id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

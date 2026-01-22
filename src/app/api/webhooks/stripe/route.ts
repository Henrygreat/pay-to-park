import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { calculateEndTime } from "@/lib/sessions";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook handler error: ${message}`);
    return NextResponse.json({ error: `Webhook handler failed: ${message}` }, { status: 500 });
  }
}

/**
 * Handle checkout.session.completed
 * Activates the parking session and sets validity period
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const parkingSessionId = session.metadata?.parkingSessionId;

  if (!parkingSessionId) {
    console.error("No parkingSessionId in checkout session metadata");
    return;
  }

  const parkingSession = await prisma.parkingSession.findUnique({
    where: { id: parkingSessionId },
  });

  if (!parkingSession) {
    console.error(`Parking session not found: ${parkingSessionId}`);
    return;
  }

  // Get the tariff to calculate end time
  const tariff = await prisma.tariff.findUnique({
    where: { passType: parkingSession.passType },
  });

  if (!tariff) {
    console.error(`Tariff not found for pass type: ${parkingSession.passType}`);
    return;
  }

  const startTime = new Date();
  const endTime = calculateEndTime(startTime, tariff.durationMinutes);

  await prisma.parkingSession.update({
    where: { id: parkingSessionId },
    data: {
      status: "ACTIVE",
      startTime,
      endTime,
      stripePaymentIntentId: session.payment_intent as string | null,
      stripeSubscriptionId: session.subscription as string | null,
      stripeCustomerId: session.customer as string | null,
    },
  });

  console.log(`Parking session activated: ${parkingSessionId}, valid until ${endTime.toISOString()}`);
}

/**
 * Handle invoice.paid (subscription renewal)
 * Creates a new parking session for the renewal period
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Only handle subscription invoices (not the first one which is handled by checkout.session.completed)
  const subscriptionRef = invoice.parent?.subscription_details?.subscription;

  if (!subscriptionRef || invoice.billing_reason === "subscription_create") {
    return;
  }

  // Extract subscription ID (can be string or Subscription object)
  const subscriptionId = typeof subscriptionRef === "string"
    ? subscriptionRef
    : subscriptionRef.id;

  // Find the most recent active session for this subscription
  const existingSession = await prisma.parkingSession.findFirst({
    where: {
      stripeSubscriptionId: subscriptionId,
      status: "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!existingSession) {
    console.error(`No active parking session found for subscription: ${subscriptionId}`);
    return;
  }

  // Get the tariff for duration
  const tariff = await prisma.tariff.findUnique({
    where: { passType: existingSession.passType },
  });

  if (!tariff) {
    console.error(`Tariff not found for pass type: ${existingSession.passType}`);
    return;
  }

  // Calculate new validity period from now
  const startTime = new Date();
  const endTime = calculateEndTime(startTime, tariff.durationMinutes);

  // Create a new session for the renewal
  await prisma.parkingSession.create({
    data: {
      plateNumber: existingSession.plateNumber,
      carMake: existingSession.carMake,
      email: existingSession.email,
      passType: existingSession.passType,
      status: "ACTIVE",
      tariffName: tariff.name,
      tariffPriceAmount: tariff.priceAmount,
      tariffCurrency: tariff.currency,
      startTime,
      endTime,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: existingSession.stripeCustomerId,
    },
  });

  console.log(`Subscription renewed for plate: ${existingSession.plateNumber}, valid until ${endTime.toISOString()}`);
}

/**
 * Handle customer.subscription.deleted
 * Logs the cancellation - sessions will naturally expire
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const sessions = await prisma.parkingSession.findMany({
    where: {
      stripeSubscriptionId: subscription.id,
      status: "ACTIVE",
    },
  });

  if (sessions.length === 0) {
    console.log(`No active sessions found for cancelled subscription: ${subscription.id}`);
    return;
  }

  // Log the cancellation - sessions will expire naturally based on end_time
  // We don't immediately invalidate as the customer has paid for the current period
  console.log(`Subscription cancelled: ${subscription.id}, ${sessions.length} session(s) will expire naturally`);
}

/**
 * Handle charge.refunded
 * Marks the parking session as REFUNDED
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id;

  if (!paymentIntentId) {
    console.error("No payment_intent on refunded charge");
    return;
  }

  // Find session by payment intent
  const session = await prisma.parkingSession.findFirst({
    where: {
      stripePaymentIntentId: paymentIntentId,
    },
  });

  if (!session) {
    console.error(`No parking session found for payment intent: ${paymentIntentId}`);
    return;
  }

  await prisma.parkingSession.update({
    where: { id: session.id },
    data: { status: "REFUNDED" },
  });

  console.log(`Parking session refunded: ${session.id} (plate: ${session.plateNumber})`);
}

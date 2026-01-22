import { NextRequest, NextResponse } from "next/server";
import { PassType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface CheckoutRequestBody {
  plateNumber: string;
  carMake: string;
  email: string;
  passType: PassType;
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutRequestBody = await request.json();
    const { plateNumber, carMake, email, passType } = body;

    // Validate required fields
    if (!plateNumber || !carMake || !email || !passType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate pass type
    if (!["DAILY", "WEEKLY", "MONTHLY"].includes(passType)) {
      return NextResponse.json(
        { error: "Invalid pass type" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Get the tariff from database
    const tariff = await prisma.tariff.findUnique({
      where: { passType },
    });

    if (!tariff || !tariff.isActive) {
      return NextResponse.json(
        { error: "This pass type is not currently available" },
        { status: 400 }
      );
    }

    // Create a PENDING parking session
    const parkingSession = await prisma.parkingSession.create({
      data: {
        plateNumber: plateNumber.toUpperCase().replace(/\s/g, ""),
        carMake,
        email: email.toLowerCase(),
        passType,
        status: "PENDING",
        tariffName: tariff.name,
        tariffPriceAmount: tariff.priceAmount,
        tariffCurrency: tariff.currency,
      },
    });

    // Determine if this is a subscription (monthly) or one-time payment
    const isSubscription = passType === "MONTHLY";

    // Create Stripe Checkout session with dynamic price_data
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: tariff.currency,
            unit_amount: tariff.priceAmount,
            product_data: {
              name: tariff.name,
              description: `Parking pass for ${plateNumber.toUpperCase()}`,
            },
            ...(isSubscription && {
              recurring: {
                interval: "month",
                interval_count: 1,
              },
            }),
          },
          quantity: 1,
        },
      ],
      metadata: {
        parkingSessionId: parkingSession.id,
        plateNumber: parkingSession.plateNumber,
        passType,
      },
      success_url: `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/checkout/cancel?session_id=${parkingSession.id}`,
    });

    // Update parking session with Stripe checkout session ID
    await prisma.parkingSession.update({
      where: { id: parkingSession.id },
      data: { stripeCheckoutSessionId: checkoutSession.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

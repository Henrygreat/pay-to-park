import { prisma } from "@/lib/prisma";
import CheckoutForm from "@/components/CheckoutForm";
import { TariffDisplay } from "@/types";

export const dynamic = "force-dynamic";

async function getActiveTariffs(): Promise<TariffDisplay[]> {
  const tariffs = await prisma.tariff.findMany({
    where: { isActive: true },
    orderBy: { priceAmount: "desc" },
  });

  return tariffs.map((t) => ({
    id: t.id,
    passType: t.passType,
    name: t.name,
    priceAmount: t.priceAmount,
    currency: t.currency,
    durationMinutes: t.durationMinutes,
    isActive: t.isActive,
    isRecommended: t.isRecommended,
  }));
}

export default async function HomePage() {
  const tariffs = await getActiveTariffs();

  if (tariffs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Parking Passes Unavailable
          </h1>
          <p className="text-gray-600">
            No parking passes are currently available for purchase. Please check
            back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="py-6 lg:py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl shadow-sm">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pay to Park</h1>
              <p className="text-sm text-gray-500">Purchase a parking pass</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-8 lg:pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <CheckoutForm tariffs={tariffs} />
        </div>
      </main>
    </div>
  );
}

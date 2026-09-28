import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getSettings, latestBillMonth } from "@/lib/data";

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [settings, latest] = await Promise.all([getSettings(), latestBillMonth()]);
    return NextResponse.json({ user, settings, latestMonth: latest });
  } catch (e) {
    console.error("Meta API error:", e);
    const now = new Date();
    return NextResponse.json({
      user,
      settings: {
        businessName: "Multi Plaza",
        tagline: "Customer Order & Billing Management",
        brands: ["KONICA MINOLTA", "TOSHIBA", "RICOH", "DUPLO"],
        address: "Silchar, Assam, India",
        phone: "+91 98765 43210",
        email: "support@multiplaza.in",
        currency: "₹",
        billPrefix: "MP",
        financialTagline: "Sales | Service | Support",
        backupEmail: "",
      },
      latestMonth: { year: now.getFullYear(), month: now.getMonth() + 1 },
    });
  }
}

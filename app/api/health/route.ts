import { NextResponse } from "next/server";
import { configuredSources, isConfigured } from "@/lib/client";

export const runtime = "nodejs";

// Lightweight configuration check for the UI's connectivity indicator and
// model pickers. Reports only registry source names (already public in the
// bundled registry data); the backend host, base URL, and key stay server-side.
export async function GET() {
  return NextResponse.json({ configured: isConfigured(), sources: configuredSources() });
}

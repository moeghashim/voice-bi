import { NextResponse } from "next/server";

import { getBusinessUiSpec } from "@/lib/brain/spec-store";
import { renderBusinessSpecToPng } from "@/lib/ui/business-image-renderer";
import { businessCatalogSchema } from "@/lib/ui/catalog";
import { createCompactImageBusinessSpec } from "@/lib/ui/compact-image-spec";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ specId: string }> },
) {
  const { specId } = await params;
  const spec = getBusinessUiSpec(specId);
  const parsed = businessCatalogSchema.safeParse(spec);

  if (!parsed.success) {
    return NextResponse.json({ error: "Spec not found." }, { status: 404 });
  }

  const compactSpec = createCompactImageBusinessSpec(parsed.data);
  const png = await renderBusinessSpecToPng(compactSpec);
  const body = png.buffer.slice(
    png.byteOffset,
    png.byteOffset + png.byteLength,
  ) as ArrayBuffer;

  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}

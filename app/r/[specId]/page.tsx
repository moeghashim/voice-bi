import { notFound } from "next/navigation";

import { BusinessUiRenderer } from "@/components/BusinessUiRenderer";
import { getBusinessUiSpec } from "@/lib/brain/spec-store";
import { businessCatalogSchema } from "@/lib/ui/catalog";

export const dynamic = "force-dynamic";

export default async function StoredSpecPage({
  params,
}: {
  params: Promise<{ specId: string }>;
}) {
  const { specId } = await params;
  const spec = getBusinessUiSpec(specId);
  const parsed = businessCatalogSchema.safeParse(spec);

  if (!parsed.success) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-blue-700">
              Voice BI shared answer
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              Interactive business view
            </h1>
          </div>
          <span className="rounded-full bg-white px-3 py-1 font-mono text-xs text-slate-600 ring-1 ring-slate-200">
            {specId}
          </span>
        </div>
        <BusinessUiRenderer spec={parsed.data} />
      </div>
    </main>
  );
}

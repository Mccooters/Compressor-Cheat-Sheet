import { getCurrentUserRole } from "@/lib/auth/currentUser";
import { listResources } from "@/lib/resources/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourceSection } from "@/components/resources/ResourceSection";
import { LiveFilterForm } from "@/components/search/LiveFilterForm";
import { fieldInputClass } from "@/components/ui/Field";

export default async function SwmsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [role, resources] = await Promise.all([
    getCurrentUserRole(),
    listResources("swms", q),
  ]);
  const canEdit = role === "admin";

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        title="SWMS"
        description="Safe Work Method Statements — company documents, for reference on site."
      />

      <LiveFilterForm>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search SWMS documents..."
          className={`min-w-0 flex-1 ${fieldInputClass}`}
        />
      </LiveFilterForm>

      <ResourceSection
        area="swms"
        title="SWMS documents"
        category="swms"
        resources={resources}
        canEdit={canEdit}
      />
    </div>
  );
}

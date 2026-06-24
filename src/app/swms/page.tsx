import { getCurrentUserRole } from "@/lib/auth/currentUser";
import { listResources } from "@/lib/resources/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourceSection } from "@/components/resources/ResourceSection";

export default async function SwmsPage() {
  const [role, resources] = await Promise.all([
    getCurrentUserRole(),
    listResources("swms"),
  ]);
  const canEdit = role === "admin";

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        title="SWMS"
        description="Safe Work Method Statements — company documents, for reference on site."
      />

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

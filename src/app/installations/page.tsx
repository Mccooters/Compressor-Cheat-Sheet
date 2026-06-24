import { getCurrentUserRole } from "@/lib/auth/currentUser";
import { listResources } from "@/lib/resources/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourceSection } from "@/components/resources/ResourceSection";
import { InstallationCalculators } from "@/components/installations/InstallationCalculators";

export default async function InstallationsPage() {
  const [role, resources] = await Promise.all([
    getCurrentUserRole(),
    listResources("installations"),
  ]);
  const canEdit = role === "admin";

  const standards = resources.filter((r) => r.category === "standard");
  const manuals = resources.filter((r) => r.category === "manual");

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        title="Installations"
        description="Standards and manufacturer installation manuals for installing equipment."
      />

      <InstallationCalculators />

      <ResourceSection
        area="installations"
        title="Standards"
        category="standard"
        resources={standards}
        canEdit={canEdit}
      />
      <ResourceSection
        area="installations"
        title="Installation manuals"
        category="manual"
        resources={manuals}
        canEdit={canEdit}
      />
    </div>
  );
}

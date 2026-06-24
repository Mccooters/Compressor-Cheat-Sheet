import { getCurrentUserRole } from "@/lib/auth/currentUser";
import { listResources } from "@/lib/resources/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourceSection } from "@/components/resources/ResourceSection";

export default async function BreathingAirInspectionsPage() {
  const [role, resources] = await Promise.all([
    getCurrentUserRole(),
    listResources("breathing_air"),
  ]);
  const canEdit = role === "admin";

  const cheatSheets = resources.filter((r) => r.category === "cheat_sheet");
  const other = resources.filter((r) => r.category === "other");

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        title="Breathing Air Inspections"
        description="Cheat sheets and reference documents for inspecting breathing air compressor systems."
      />

      <ResourceSection
        area="breathing_air"
        title="Cheat sheets"
        category="cheat_sheet"
        resources={cheatSheets}
        canEdit={canEdit}
      />
      <ResourceSection
        area="breathing_air"
        title="Other resources"
        category="other"
        resources={other}
        canEdit={canEdit}
      />
    </div>
  );
}

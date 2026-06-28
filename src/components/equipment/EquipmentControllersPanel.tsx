import Link from "next/link";
import { listControllers } from "@/lib/controllers/queries";
import {
  linkEquipmentController,
  unlinkEquipmentController,
} from "@/lib/equipment/controllerLinks";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldInputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type LinkedController = { id: string; displayName: string };

export async function EquipmentControllersPanel({
  equipmentId,
  linkedControllers,
}: {
  equipmentId: string;
  linkedControllers: LinkedController[];
}) {
  const allControllers = await listControllers();
  const linkedIds = new Set(linkedControllers.map((c) => c.id));
  const availableControllers = allControllers.filter(
    (c) => !linkedIds.has(c.id)
  );

  return (
    <Card as="section" className="space-y-4">
      <h2 className="font-semibold text-slate-900 dark:text-white">Controllers</h2>

      {linkedControllers.length > 0 ? (
        <ul className="space-y-2">
          {linkedControllers.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm dark:border-zinc-700"
            >
              <Link
                href={`/controllers/${c.id}`}
                className="text-orange-600 underline dark:text-orange-400"
              >
                {c.displayName}
              </Link>
              <form action={unlinkEquipmentController.bind(null, equipmentId, c.id)}>
                <Button type="submit" variant="danger">
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>No controllers linked yet.</EmptyState>
      )}

      {availableControllers.length > 0 && (
        <form action={linkEquipmentController} className="flex gap-3">
          <input type="hidden" name="equipmentId" value={equipmentId} />
          <select
            name="controllerId"
            required
            defaultValue=""
            className={`flex-1 ${fieldInputClass}`}
          >
            <option value="" disabled>
              Select a controller...
            </option>
            {availableControllers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.manufacturer} {c.modelName}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary">
            Add
          </Button>
        </form>
      )}
    </Card>
  );
}

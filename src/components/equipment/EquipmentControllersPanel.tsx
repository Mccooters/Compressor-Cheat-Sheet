import Link from "next/link";
import { listControllers } from "@/lib/controllers/queries";
import {
  linkEquipmentController,
  unlinkEquipmentController,
} from "@/lib/equipment/controllerLinks";

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
    <section className="space-y-4 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-medium">Controllers</h2>

      {linkedControllers.length > 0 ? (
        <ul className="space-y-2">
          {linkedControllers.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border border-neutral-200 p-2 text-sm dark:border-neutral-800"
            >
              <Link href={`/controllers/${c.id}`} className="underline">
                {c.displayName}
              </Link>
              <form action={unlinkEquipmentController.bind(null, equipmentId, c.id)}>
                <button type="submit" className="text-red-600 hover:underline">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">No controllers linked yet.</p>
      )}

      {availableControllers.length > 0 && (
        <form action={linkEquipmentController} className="flex gap-3">
          <input type="hidden" name="equipmentId" value={equipmentId} />
          <select
            name="controllerId"
            required
            defaultValue=""
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
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
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            Add
          </button>
        </form>
      )}
    </section>
  );
}

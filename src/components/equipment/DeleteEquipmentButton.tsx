"use client";

import { deleteEquipment } from "@/lib/equipment/actions";

export function DeleteEquipmentButton({
  equipmentId,
  displayName,
  className,
}: {
  equipmentId: string;
  displayName: string;
  className?: string;
}) {
  return (
    <form
      action={deleteEquipment.bind(null, equipmentId)}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Delete "${displayName}"? This cannot be undone and will also remove any attached document links.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className={className ?? "text-red-600 hover:underline"}>
        Delete
      </button>
    </form>
  );
}

"use client";

import { deleteController } from "@/lib/controllers/actions";

export function DeleteControllerButton({
  controllerId,
  displayName,
  className,
}: {
  controllerId: string;
  displayName: string;
  className?: string;
}) {
  return (
    <form
      action={deleteController.bind(null, controllerId)}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Delete "${displayName}"? This cannot be undone and will also remove its access codes.`
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

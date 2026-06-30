"use client";

import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/ui/Button";

function SubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={buttonClass("primary")} disabled={pending}>
      {pending
        ? "Syncing… this may take a minute"
        : `Sync ${count} missing folder${count !== 1 ? "s" : ""}`}
    </button>
  );
}

export function SyncFoldersButton({ count }: { count: number }) {
  return <SubmitButton count={count} />;
}

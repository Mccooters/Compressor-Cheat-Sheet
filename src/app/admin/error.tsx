"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Error"
        title="Something went wrong"
        description="This admin page hit an unexpected error. Try again, and if it keeps happening, check the server logs."
      />
      <Button onClick={() => unstable_retry()}>Try again</Button>
    </div>
  );
}

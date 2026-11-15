"use client";

import { useActionState } from "react";
import { createPhoneToken, type NewTokenState } from "@/lib/mobile/tokenActions";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/Field";

const initial: NewTokenState = {};

export function NewTokenForm() {
  const [state, action, pending] = useActionState(createPhoneToken, initial);

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
          Whose phone
          <input
            name="label"
            required
            maxLength={80}
            placeholder="Josh's iPhone"
            className={fieldInputClass}
          />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Making…" : "Make a token"}
        </Button>
      </form>

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      {state.token && (
        <div
          role="status"
          className="space-y-2 rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-500/40 dark:bg-orange-500/10"
        >
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Token for {state.label}. Copy it now: it can&apos;t be shown again.
          </p>
          <code className="block select-all break-all rounded bg-white px-3 py-2 text-sm text-slate-900 dark:bg-zinc-950 dark:text-white">
            {state.token}
          </code>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            On the phone: Air Assist settings, Access token.
          </p>
        </div>
      )}
    </div>
  );
}

import { createFaultTree } from "@/lib/faultTrees/actions";
import { Field, fieldInputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function NewFaultTreeForm() {
  return (
    <form action={createFaultTree} className="max-w-xl space-y-4">
      <Field label="Title">
        <input
          name="title"
          required
          placeholder="e.g. Compressor won't start"
          className={fieldInputClass}
        />
      </Field>
      <Field label="Description">
        <textarea name="description" rows={2} className={fieldInputClass} />
      </Field>
      <p className="text-xs text-slate-500 dark:text-slate-500">
        You can set the category, equipment scope, and start adding nodes
        after creating the tree.
      </p>
      <Button type="submit">Create</Button>
    </form>
  );
}

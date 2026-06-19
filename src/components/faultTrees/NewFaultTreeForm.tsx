import { createFaultTree } from "@/lib/faultTrees/actions";

export function NewFaultTreeForm() {
  return (
    <form action={createFaultTree} className="max-w-xl space-y-4">
      <div>
        <label className="block text-sm font-medium">Title</label>
        <input
          name="title"
          required
          placeholder="e.g. Compressor won't start"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea
          name="description"
          rows={2}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
      <p className="text-xs text-neutral-500">
        You can set equipment scope and start adding nodes after creating the
        tree.
      </p>
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Create
      </button>
    </form>
  );
}

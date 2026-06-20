import {
  addControllerPassword,
  deleteControllerPassword,
} from "@/lib/controllers/actions";

type ControllerPasswordRow = {
  id: string;
  label: string;
  value: string;
};

export function ControllerPasswordsPanel({
  controllerId,
  passwords,
}: {
  controllerId: string;
  passwords: ControllerPasswordRow[];
}) {
  return (
    <section className="space-y-4 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-medium">Access codes</h2>

      {passwords.length > 0 && (
        <ul className="space-y-2">
          {passwords.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-md border border-neutral-200 p-2 text-sm dark:border-neutral-800"
            >
              <span>
                <span className="font-medium">{p.label}</span>{" "}
                <span className="font-mono text-neutral-600 dark:text-neutral-400">
                  {p.value}
                </span>
              </span>
              <form action={deleteControllerPassword.bind(null, p.id, controllerId)}>
                <button type="submit" className="text-red-600 hover:underline">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={addControllerPassword} className="space-y-3">
        <input type="hidden" name="controllerId" value={controllerId} />
        <div className="flex gap-3">
          <input
            name="label"
            placeholder="Label (e.g. Service, User, Factory)"
            required
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="value"
            placeholder="Code or instructions"
            required
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          Add code
        </button>
      </form>
    </section>
  );
}

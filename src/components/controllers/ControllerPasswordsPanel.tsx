import {
  addControllerPassword,
  deleteControllerPassword,
} from "@/lib/controllers/actions";
import { Card } from "@/components/ui/Card";
import { fieldInputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

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
    <Card as="section" className="space-y-4">
      <h2 className="font-semibold text-slate-900 dark:text-white">Access codes</h2>

      {passwords.length > 0 && (
        <ul className="space-y-2">
          {passwords.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm dark:border-zinc-700"
            >
              <span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {p.label}
                </span>{" "}
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {p.value}
                </span>
              </span>
              <form action={deleteControllerPassword.bind(null, p.id, controllerId)}>
                <Button type="submit" variant="danger">
                  Remove
                </Button>
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
            className={`flex-1 ${fieldInputClass}`}
          />
          <input
            name="value"
            placeholder="Code or instructions"
            required
            className={`flex-1 ${fieldInputClass}`}
          />
        </div>
        <Button type="submit" variant="secondary">
          Add code
        </Button>
      </form>
    </Card>
  );
}

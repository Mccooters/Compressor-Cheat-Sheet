import {
  addControllerFaultCode,
  deleteControllerFaultCode,
} from "@/lib/controllers/actions";
import { Card } from "@/components/ui/Card";
import { fieldInputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type ControllerFaultCodeRow = {
  id: string;
  code: string;
  description: string;
};

export function ControllerFaultCodesPanel({
  controllerId,
  faultCodes,
}: {
  controllerId: string;
  faultCodes: ControllerFaultCodeRow[];
}) {
  return (
    <Card as="section" className="space-y-4">
      <h2 className="font-semibold text-slate-900 dark:text-white">Fault codes</h2>

      {faultCodes.length > 0 && (
        <ul className="space-y-2">
          {faultCodes.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700"
            >
              <span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {f.code}
                </span>{" "}
                <span className="text-slate-600 dark:text-slate-400">
                  {f.description}
                </span>
              </span>
              <form action={deleteControllerFaultCode.bind(null, f.id, controllerId)}>
                <Button type="submit" variant="danger">
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={addControllerFaultCode} className="space-y-3">
        <input type="hidden" name="controllerId" value={controllerId} />
        <div className="flex gap-3">
          <input
            name="code"
            placeholder="Code (e.g. E:0119, F062, SR Fault 33)"
            required
            className={`flex-1 ${fieldInputClass}`}
          />
          <input
            name="description"
            placeholder="What it means / how to clear it"
            required
            className={`flex-1 ${fieldInputClass}`}
          />
        </div>
        <Button type="submit" variant="secondary">
          Add fault code
        </Button>
      </form>
    </Card>
  );
}

import { useState, useSyncExternalStore } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * In-app replacements for window.confirm/prompt, which render as a white system box and block
 * the page. Callable from any handler; <DialogHost /> (mounted once in App) shows them.
 */

type Options = { description?: string; confirmLabel?: string };
type Request =
  | ({ kind: "confirm"; id: number; title: string; destructive?: boolean; resolve: (ok: boolean) => void } & Options)
  | ({ kind: "prompt"; id: number; title: string; defaultValue?: string; resolve: (value: string | null) => void } & Options);

let current: Request | null = null;
let nextId = 0;
const listeners = new Set<() => void>();

function settle(request: Request, result: boolean | string | null): void {
  if (current !== request) return;
  current = null;
  for (const listener of listeners) listener();
  if (request.kind === "confirm") request.resolve(result === true);
  else request.resolve(typeof result === "string" ? result : null);
}

function show(request: Request): void {
  if (current) settle(current, null);
  current = request;
  for (const listener of listeners) listener();
}

/** Resolves true when the GM confirms; Escape or "Anuluj" resolve false. */
export function confirmDialog(title: string, options: Options & { destructive?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => show({ kind: "confirm", id: ++nextId, title, ...options, resolve }));
}

/** Resolves with the typed text, or null when cancelled. */
export function promptDialog(title: string, options: Options & { defaultValue?: string } = {}): Promise<string | null> {
  return new Promise((resolve) => show({ kind: "prompt", id: ++nextId, title, ...options, resolve }));
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function DialogHost() {
  const request = useSyncExternalStore(subscribe, () => current);
  return (
    <AlertDialog open={!!request} onOpenChange={(open) => !open && request && settle(request, null)}>
      {request && <DialogBody key={request.id} request={request} />}
    </AlertDialog>
  );
}

function DialogBody({ request }: { request: Request }) {
  const [value, setValue] = useState(request.kind === "prompt" ? request.defaultValue ?? "" : "");
  // Radix warns about a dialog without a description unless told there is none on purpose.
  const describedBy = request.description ? {} : { "aria-describedby": undefined };
  const header = (
    <AlertDialogHeader>
      <AlertDialogTitle className="text-balance">{request.title}</AlertDialogTitle>
      {request.description && <AlertDialogDescription>{request.description}</AlertDialogDescription>}
    </AlertDialogHeader>
  );

  if (request.kind === "confirm") {
    return (
      <AlertDialogContent {...describedBy}>
        {header}
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            className={request.destructive ? buttonVariants({ variant: "destructive" }) : undefined}
            onClick={() => settle(request, true)}
          >
            {request.confirmLabel ?? "Tak"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    );
  }

  return (
    <AlertDialogContent {...describedBy}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          settle(request, value);
        }}
      >
        {header}
        <Input value={value} onChange={(e) => setValue(e.target.value)} onFocus={(e) => e.target.select()} aria-label={request.title} />
        <AlertDialogFooter>
          <AlertDialogCancel type="button">Anuluj</AlertDialogCancel>
          <Button type="submit">{request.confirmLabel ?? "Zapisz"}</Button>
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
  );
}

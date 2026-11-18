import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorMessage } from "@/lib/api/messages";

/** Confirmation for irreversible actions (deactivate, revoke, end, reject…). Waits for the server and stays open on error. */
export function ConfirmAction({ trigger, title, description, confirmLabel = "تأیید", destructive, requireReason, reasonLabel = "دلیل", onConfirm, open, onOpenChange }: {
  trigger?: ReactNode; title: string; description?: ReactNode; confirmLabel?: string; destructive?: boolean; requireReason?: boolean; reasonLabel?: string;
  onConfirm: (reason: string) => unknown | Promise<unknown>; open?: boolean; onOpenChange?: (v: boolean) => void;
}) {
  const [inner, setInner] = useState(false);
  const isOpen = open ?? inner;
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (v: boolean) => { if (busy) return; (onOpenChange ?? setInner)(v); if (!v) { setReason(""); setErr(null); } };
  const run = async () => {
    setBusy(true); setErr(null);
    try { await onConfirm(reason.trim()); setBusy(false); set(false); (onOpenChange ?? setInner)(false); setReason(""); }
    catch (e) { setErr(errorMessage(e)); setBusy(false); }
  };
  return (
    <AlertDialog open={isOpen} onOpenChange={set}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader className="text-right"><AlertDialogTitle>{title}</AlertDialogTitle>{description && <AlertDialogDescription asChild><div>{description}</div></AlertDialogDescription>}</AlertDialogHeader>
        {requireReason && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-reason">{reasonLabel} <span className="text-destructive">*</span></Label>
            <Textarea id="confirm-reason" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          </div>
        )}
        {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={busy}>انصراف</AlertDialogCancel>
          <Button variant={destructive ? "destructive" : "default"} disabled={busy || (requireReason && !reason.trim())} onClick={run}>
            {busy && <Loader2 className="animate-spin" />}{confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

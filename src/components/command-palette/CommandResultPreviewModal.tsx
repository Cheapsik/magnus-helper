import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { renderEntityPreview, type EntityPreviewType } from "@/components/global-drawer/DrawerContent";

interface CommandResultPreviewModalProps {
  isOpen: boolean;
  type: EntityPreviewType | null;
  id: string;
  title: string;
  onClose: () => void;
  onOpenFullPage: () => void;
}

export function CommandResultPreviewModal({
  isOpen,
  type,
  id,
  title,
  onClose,
  onOpenFullPage,
}: CommandResultPreviewModalProps) {
  if (!type) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPortal>
        <DialogOverlay className="z-[10000] bg-black/60" />
        <DialogPrimitive.Content className="fixed left-1/2 top-[8%] z-[10001] flex h-[84vh] w-[min(860px,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-xl border bg-background shadow-2xl outline-none duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-4 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-4 data-[state=closed]:zoom-out-95 motion-reduce:transition-none">
          <div className="border-b px-4 py-3">
            <DialogPrimitive.Title className="truncate text-sm font-semibold">{title || "Podglad elementu"}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-xs text-muted-foreground">
              Podglad wyniku wyszukiwania
            </DialogPrimitive.Description>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{renderEntityPreview(type, id)}</div>
          <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Zamknij
            </Button>
            <Button type="button" onClick={onOpenFullPage}>
              Przejdz do podstrony
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

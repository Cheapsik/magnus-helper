import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Material } from "@/lib/sharedCampaigns";

/** A material on the full screen; clicking the image toggles fit / actual size. */
export function MaterialViewer({ material, imageUrl, onClose }: { material: Material | null; imageUrl?: string; onClose: () => void }) {
  const [actualSize, setActualSize] = useState(false);
  return (
    <Dialog open={Boolean(material)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-black p-0 sm:rounded-none">
        <DialogTitle className="px-4 pb-2 pt-4 text-lg text-white">{material?.title}</DialogTitle>
        {imageUrl ? (
          <div className={cn("min-h-0 flex-1", actualSize ? "overflow-auto" : "flex items-center justify-center overflow-hidden")}>
            <img
              src={imageUrl}
              alt={material?.title ?? ""}
              onClick={() => setActualSize((v) => !v)}
              className={cn(actualSize ? "max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain")}
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        {material?.body && (
          <p className="max-h-[30vh] shrink-0 overflow-y-auto whitespace-pre-wrap px-4 py-3 text-sm text-white/90">{material.body}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

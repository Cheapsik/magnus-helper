import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeftRight, ChevronLeft, ExternalLink, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerOverlay, DrawerPortal } from "@/components/ui/drawer";
import { useDrawer } from "@/context/DrawerContext";
import { cn } from "@/lib/utils";
import { DrawerContent as DrawerContentRenderer } from "@/components/global-drawer/DrawerContent";

type DrawerMode = "desktopPush" | "tabletOverlay" | "mobileSheet";

const DESKTOP_BREAKPOINT = 1200;
const MOBILE_BREAKPOINT = 768;

function resolveDrawerMode(width: number): DrawerMode {
  if (width < MOBILE_BREAKPOINT) {
    return "mobileSheet";
  }
  if (width < DESKTOP_BREAKPOINT) {
    return "tabletOverlay";
  }
  return "desktopPush";
}

function useDrawerMode(): DrawerMode {
  const [mode, setMode] = useState<DrawerMode>(() => {
    if (typeof window === "undefined") {
      return "desktopPush";
    }
    return resolveDrawerMode(window.innerWidth);
  });

  useEffect(() => {
    const onResize = () => setMode(resolveDrawerMode(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return mode;
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}

function DrawerHeaderBar() {
  const { activeItem, closeDrawer, canGoBack, goBack } = useDrawer();
  const label = activeItem?.name ?? "Podglad";
  const type = activeItem?.type ?? "element";

  return (
    <header className="sticky top-0 z-10 border-b bg-card/95 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {canGoBack ? (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Wroc do poprzedniego panelu"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{type}</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Otworz pelny widok"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Pelny widok
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Historia panelu"
          disabled
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Historia
        </button>
        <button
          type="button"
          onClick={closeDrawer}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Zamknij panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function DrawerCard({
  indexFromTop,
  isDesktopPush,
  content,
}: {
  indexFromTop: number;
  isDesktopPush: boolean;
  content: ReactNode;
}) {
  const layer = Math.max(0, 2 - indexFromTop);
  const offsetPx = layer * 20;
  const scale = 1 - layer * 0.02;

  return (
    <section
      className={cn(
        "absolute inset-0 overflow-hidden rounded-none border-l bg-background shadow-2xl transition-transform duration-200 ease-out motion-reduce:transition-none md:rounded-none",
        !isDesktopPush && "border",
      )}
      style={{
        transform: `translateX(${offsetPx}px) scale(${scale})`,
        zIndex: 30 + indexFromTop,
      }}
    >
      <DrawerHeaderBar />
      <div className="h-[calc(100%-57px)] overflow-y-auto p-4">
        {content}
      </div>
    </section>
  );
}

export function GlobalDrawer() {
  const { isOpen, closeDrawer, stack } = useDrawer();
  const mode = useDrawerMode();

  useBodyScrollLock(isOpen && mode !== "desktopPush");

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [closeDrawer, isOpen]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const isMobile = mode === "mobileSheet";
  const isDesktopPush = mode === "desktopPush";
  const widthClass = isDesktopPush ? "w-[420px]" : mode === "tabletOverlay" ? "w-1/2 min-w-[360px] max-w-[520px]" : "w-full";
  const layers = stack.slice(-3);

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(next) => !next && closeDrawer()}>
        <DrawerPortal>
          <DrawerOverlay className="bg-black/60" />
          <DrawerContent className="h-[85dvh] rounded-t-2xl border-0 bg-background p-0">
            <div className="relative h-full overflow-hidden">
              {layers.map((_, index) => (
                <DrawerCard
                  key={`${index}-${layers[index]?.id}`}
                  indexFromTop={index}
                  isDesktopPush={false}
                  content={<DrawerContentRenderer item={layers[index]} />}
                />
              ))}
            </div>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>
    );
  }

  return createPortal(
    <>
      {!isDesktopPush ? (
        <button
          type="button"
          onClick={closeDrawer}
          className="fixed inset-0 z-[109] bg-black/60"
          aria-label="Zamknij panel"
        />
      ) : null}
      <aside
        className={cn(
          "fixed right-0 top-0 z-[110] h-screen overflow-hidden border-l bg-background shadow-2xl transition-transform [transition-duration:220ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          widthClass,
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="relative h-full overflow-hidden">
          {layers.map((_, index) => (
            <DrawerCard
              key={`${index}-${layers[index]?.id}`}
              indexFromTop={index}
              isDesktopPush={isDesktopPush}
              content={<DrawerContentRenderer item={layers[index]} />}
            />
          ))}
        </div>
      </aside>
    </>,
    document.body,
  );
}

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[--radius] text-[length:--fs-sm] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Struck metal: the top edge catches the light (index.css, rule 1).
        default: "bg-primary font-semibold text-primary-foreground shadow-[inset_0_1px_0_hsl(45_90%_88%/0.4)] hover:bg-primary/90",
        destructive: "bg-destructive font-semibold text-destructive-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.2)] hover:bg-destructive/90",
        outline: "border border-input bg-transparent text-foreground hover:border-primary/50 hover:bg-secondary",
        secondary: "border border-border bg-secondary text-foreground shadow-[inset_0_1px_0_hsl(var(--lit-edge)/0.06)] hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[--h-control] px-3.5",
        sm: "h-[--h-control-sm] px-3",
        lg: "h-[--h-control-lg] px-6",
        icon: "h-[--h-control] w-[--h-control]",
        "icon-sm": "h-[--h-control-sm] w-[--h-control-sm]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

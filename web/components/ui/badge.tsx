import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide", {
  variants: {
    variant: {
      default: "bg-secondary text-foreground",
      valid: "bg-emerald-100 text-emerald-900",
      bad: "bg-red-100 text-red-900",
      warn: "bg-amber-100 text-amber-950",
    },
  },
  defaultVariants: { variant: "default" },
});

function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };

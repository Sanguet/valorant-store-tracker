import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonStyles = cva(
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-[#ff4655] text-white hover:bg-[#ff6170]",
        quiet: "border border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10",
        ghost: "text-zinc-300 hover:bg-white/10",
      },
    },
    defaultVariants: { variant: "quiet" },
  },
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonStyles> {
  asChild?: boolean;
}

export function Button({ className, variant, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonStyles({ variant }), className)} {...props} />;
}

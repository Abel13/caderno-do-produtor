import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      default: "bg-emerald-700 text-white shadow-sm hover:bg-emerald-800",
      secondary: "bg-white text-stone-800 ring-1 ring-stone-200 hover:bg-stone-50",
      ghost: "text-stone-700 hover:bg-stone-100"
    },
    size: { default: "h-11 px-5", sm: "h-9 px-3", lg: "h-12 px-6 text-base", icon: "size-11" }
  },
  defaultVariants: { variant: "default", size: "default" }
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
export { buttonVariants };

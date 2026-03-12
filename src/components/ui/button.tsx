import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "premium"
    size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300 disabled:pointer-events-none disabled:opacity-50",
                    {
                        "bg-slate-900 text-slate-50 shadow hover:bg-slate-900/90": variant === "default",
                        "bg-red-500 text-slate-50 shadow-sm hover:bg-red-500/90": variant === "destructive",
                        "border border-slate-200 bg-transparent shadow-sm hover:bg-slate-100 hover:text-slate-900": variant === "outline",
                        "bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-100/80": variant === "secondary",
                        "hover:bg-slate-100 hover:text-slate-900": variant === "ghost",
                        "text-slate-900 underline-offset-4 hover:underline": variant === "link",
                        "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:opacity-90": variant === "premium",
                        "h-9 px-4 py-2": size === "default",
                        "h-8 rounded-md px-3 text-xs": size === "sm",
                        "h-10 rounded-md px-8": size === "lg",
                        "h-9 w-9": size === "icon",
                    },
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }

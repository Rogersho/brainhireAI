import { cn } from "@/lib/utils";

interface BrandLogoProps {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const iconSizes = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-9 w-9",
};

const textSizes = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
};

export function BrandLogo({ showText = true, size = "md", className }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={cn(iconSizes[size], "shrink-0")}
      >
        <rect width="64" height="64" rx="16" className="fill-foreground" />
        <rect x="17" y="16" width="8" height="32" rx="4" className="fill-background" />
        <rect x="39" y="16" width="8" height="32" rx="4" className="fill-background" />
        <rect x="23" y="28" width="18" height="8" rx="4" className="fill-background" />
        <circle cx="43" cy="19" r="3.2" fill="#38BDF8" />
      </svg>
      {showText && (
        <span
          className={cn(
            "font-heading tracking-tight text-foreground leading-none",
            textSizes[size]
          )}
        >
          <span className="font-bold">hoobe</span>
          <span className="font-light text-muted-foreground ml-1">hr</span>
        </span>
      )}
    </span>
  );
}

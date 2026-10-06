import Image from "next/image";
import Link from "next/link";
import { cn } from "@/components/ui/utils";

type BrandVariant = "wordmark" | "horizontal" | "symbol";

type BrandProps = {
  variant?: BrandVariant;
  height?: 24 | 32;
  decorative?: boolean;
  className?: string;
};

const brandWidths: Record<BrandVariant, number> = {
  wordmark: 701,
  horizontal: 857,
  symbol: 96
};

export function FixFlowBrand({
  variant = "wordmark",
  height = 24,
  decorative = false,
  className
}: BrandProps) {
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "FixFlow"}
      aria-hidden={decorative || undefined}
      className={cn("inline-flex shrink-0 items-center p-[0.29em] align-middle", className)}
      style={{ fontSize: height }}
    >
      <Image
        src={`/brand/fixflow-${variant}.svg`}
        alt=""
        aria-hidden="true"
        width={brandWidths[variant]}
        height={100}
        unoptimized
        loading="eager"
        className="block dark:hidden"
        style={{ height, width: "auto" }}
      />
      <Image
        src={`/brand/fixflow-${variant}-white.svg`}
        alt=""
        aria-hidden="true"
        width={brandWidths[variant]}
        height={100}
        unoptimized
        loading="eager"
        className="hidden dark:block"
        style={{ height, width: "auto" }}
      />
    </span>
  );
}

type LogoProps = Omit<BrandProps, "decorative"> & {
  compact?: boolean;
  href?: string;
};

export function FixFlowLogo({ compact = false, variant = "wordmark", height = 24, href = "/app", className }: LogoProps) {
  return (
    <Link href={href} className={cn("inline-flex min-h-11 shrink-0 items-center rounded-xl", className)} aria-label="FixFlow">
      <FixFlowBrand variant={compact ? "symbol" : variant} height={height} decorative />
    </Link>
  );
}

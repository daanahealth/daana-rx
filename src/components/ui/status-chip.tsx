"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import type { ItemStatus } from "@daana-health/inventory-core";
import { cn } from "@/lib/utils";

/**
 * StatusChip
 *
 * Per the MASS MVP spec ("Status Chips") this renders the canonical
 * coloured status indicator used across the Inventory tab, cart, and
 * search results. The colour mapping is:
 *
 *  - Active            -> green
 *  - In Cart           -> blue
 *  - Pending Approval  -> amber
 *  - Checked Out       -> gray
 *  - Removed           -> dark gray
 *  - Expired           -> red, with a `!` indicator
 */

export interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: ItemStatus;
  /** Optional override of the human-readable label. */
  label?: string;
  /** Size variant. */
  size?: "sm" | "md";
}

const STATUS_LABELS: Record<ItemStatus, string> = {
  active: "Active",
  in_cart: "In Cart",
  pending_approval: "Pending Approval",
  checked_out: "Checked Out",
  removed: "Removed",
  expired: "Expired",
};

// Tailwind classes per status. Uses inline literal colours so they are
// shipped in the JIT output regardless of theme tokens, but pairs nicely
// with the existing healthcare teal palette.
const STATUS_CLASSES: Record<ItemStatus, string> = {
  active:
    "bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/15 dark:text-green-300 dark:ring-green-400/30",
  in_cart:
    "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/30",
  pending_approval:
    "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/30",
  checked_out:
    "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-500/20 dark:bg-gray-500/15 dark:text-gray-300 dark:ring-gray-400/30",
  removed:
    "bg-gray-200 text-gray-900 ring-1 ring-inset ring-gray-700/30 dark:bg-gray-800/60 dark:text-gray-200 dark:ring-gray-500/30",
  expired:
    "bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-400/30",
};

export function StatusChip({
  status,
  label,
  size = "md",
  className,
  ...rest
}: StatusChipProps) {
  const text = label ?? STATUS_LABELS[status];
  const isExpired = status === "expired";

  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium transition-colors duration-200",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        STATUS_CLASSES[status],
        className
      )}
      {...rest}
    >
      {isExpired ? (
        <AlertCircle
          className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")}
          aria-hidden="true"
        />
      ) : (
        <span
          className={cn(
            "inline-block rounded-full",
            size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
            status === "active" && "bg-green-500",
            status === "in_cart" && "bg-blue-500",
            status === "pending_approval" && "bg-amber-500",
            status === "checked_out" && "bg-gray-400",
            status === "removed" && "bg-gray-600"
          )}
          aria-hidden="true"
        />
      )}
      <span>{text}</span>
    </span>
  );
}

export { STATUS_LABELS as statusLabels };

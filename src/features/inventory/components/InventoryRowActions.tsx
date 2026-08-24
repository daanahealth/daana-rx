'use client';

// Per-row kebab menu: View details · Edit · Check out directly (superadmin) ·
// Remove · View transaction history. Stock actions are hidden for read-only
// roles (providers) and disabled once a unit is checked out or removed.

import { Edit, Eye, History, MoreVertical, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isTerminal, type InventoryRow } from '../mappers';

export interface RowActionHandlers {
  onDetails: (row: InventoryRow) => void;
  onEdit: (row: InventoryRow) => void;
  onCheckout: (row: InventoryRow) => void;
  onRemove: (row: InventoryRow) => void;
  onHistory: (row: InventoryRow) => void;
}

interface InventoryRowActionsProps extends RowActionHandlers {
  row: InventoryRow;
  isSuperadmin: boolean;
  /** `canModifyStock(role)` — false hides Edit / Check out / Remove entirely. */
  mayModify: boolean;
}

export function InventoryRowActions({
  row,
  isSuperadmin,
  mayModify,
  onDetails,
  onEdit,
  onCheckout,
  onRemove,
  onHistory,
}: InventoryRowActionsProps) {
  const terminal = isTerminal(row);
  return (
    <>
      {/* On phones the name is not the obvious tap target, so offer Details as a button. */}
      <Button variant="outline" size="touch" className="lg:hidden" onClick={() => onDetails(row)}>
        Details
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 lg:h-9 lg:w-9 max-lg:!flex-none max-lg:w-11"
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
            <span className="sr-only">Open actions menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onDetails(row)}>
            <Eye className="mr-2 h-4 w-4" aria-hidden />
            View details
          </DropdownMenuItem>
          {mayModify ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(row)} disabled={terminal}>
                <Edit className="mr-2 h-4 w-4" aria-hidden />
                Edit
              </DropdownMenuItem>
              {isSuperadmin ? (
                <DropdownMenuItem onClick={() => onCheckout(row)} disabled={terminal}>
                  <ShoppingCart className="mr-2 h-4 w-4" aria-hidden />
                  Check out directly
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onClick={() => onRemove(row)}
                disabled={terminal}
                className="text-danger focus:text-danger"
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                Remove
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onHistory(row)}>
            <History className="mr-2 h-4 w-4" aria-hidden />
            View transaction history
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

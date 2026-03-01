import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UnitData } from '../types/graphql';

export interface CartItem {
  unit: UnitData;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  notes: string;
}

const initialState: CartState = {
  items: [],
  notes: '',
};

const CART_STORAGE_KEY = 'daanrx_cart';

function persistCart(state: CartState) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{ unit: UnitData; quantity: number }>) => {
      const { unit, quantity } = action.payload;
      const existingIndex = state.items.findIndex((item) => item.unit.unitId === unit.unitId);
      if (existingIndex >= 0) {
        state.items[existingIndex].quantity += quantity;
        // Cap at available quantity
        if (state.items[existingIndex].quantity > unit.availableQuantity) {
          state.items[existingIndex].quantity = unit.availableQuantity;
        }
      } else {
        state.items.push({ unit, quantity: Math.min(quantity, unit.availableQuantity) });
      }
      persistCart(state);
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.unit.unitId !== action.payload);
      persistCart(state);
    },
    updateQuantity: (state, action: PayloadAction<{ unitId: string; quantity: number }>) => {
      const { unitId, quantity } = action.payload;
      const item = state.items.find((i) => i.unit.unitId === unitId);
      if (item) {
        item.quantity = Math.min(Math.max(1, quantity), item.unit.availableQuantity);
      }
      persistCart(state);
    },
    setCartNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload;
      persistCart(state);
    },
    clearCart: (state) => {
      state.items = [];
      state.notes = '';
      persistCart(state);
    },
    restoreCart: (state) => {
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(CART_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as CartState;
            state.items = parsed.items || [];
            state.notes = parsed.notes || '';
          }
        } catch {
          // Ignore parse errors
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase('auth/logout', (state) => {
      state.items = [];
      state.notes = '';
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(CART_STORAGE_KEY);
        } catch {
          // Ignore
        }
      }
    });
  },
});

export const { addToCart, removeFromCart, updateQuantity, setCartNotes, clearCart, restoreCart } = cartSlice.actions;
export default cartSlice.reducer;

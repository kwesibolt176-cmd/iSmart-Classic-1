import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "@/hooks/use-toast";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  description?: string;
}

interface SelectedTable {
  id: string;
  number: number;
  capacity: number;
}

interface CartContextType {
  items: CartItem[];
  selectedTable: SelectedTable | null;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setTable: (table: SelectedTable | null) => void;
  clearTable: () => void;
  setItems: (items: CartItem[]) => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
}

const CART_STORAGE_KEY = "pos_cart_items";
const TABLE_STORAGE_KEY = "pos_selected_table";

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};

// Helper to safely parse JSON from sessionStorage
const getStoredItems = (): CartItem[] => {
  try {
    const stored = sessionStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const getStoredTable = (): SelectedTable | null => {
  try {
    const stored = sessionStorage.getItem(TABLE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(getStoredItems);
  const [selectedTable, setSelectedTable] = useState<SelectedTable | null>(getStoredTable);

  // Persist cart items to sessionStorage
  useEffect(() => {
    if (items.length > 0) {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } else {
      sessionStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [items]);

  // Persist selected table to sessionStorage
  useEffect(() => {
    if (selectedTable) {
      sessionStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify(selectedTable));
    } else {
      sessionStorage.removeItem(TABLE_STORAGE_KEY);
    }
  }, [selectedTable]);

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id);
      if (existingItem) {
        toast({
          title: "Updated cart",
          description: `${item.name} quantity increased`,
        });
        return prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      toast({
        title: "Added to cart",
        description: `${item.name} has been added${selectedTable ? ` (Table ${selectedTable.number})` : ''}`,
      });
      return [...prevItems, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
    toast({
      title: "Removed from cart",
      description: "Item has been removed",
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setSelectedTable(null);
    sessionStorage.removeItem(CART_STORAGE_KEY);
    sessionStorage.removeItem(TABLE_STORAGE_KEY);
  };

  const setTable = (table: SelectedTable | null) => {
    setSelectedTable(table);
    if (table) {
      toast({
        title: `Table ${table.number} selected`,
        description: "Add items to this table's order",
      });
    }
  };

  const clearTable = () => {
    setSelectedTable(null);
  };

  const setCartItems = (newItems: CartItem[]) => {
    setItems(newItems);
  };

  const getTotalItems = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getSubtotal = () => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getTax = () => {
    return getSubtotal() * 0.08; // 8% tax
  };

  const getTotal = () => {
    return getSubtotal() + getTax();
  };

  return (
    <CartContext.Provider
      value={{
        items,
        selectedTable,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setTable,
        clearTable,
        setItems: setCartItems,
        getTotalItems,
        getSubtotal,
        getTax,
        getTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

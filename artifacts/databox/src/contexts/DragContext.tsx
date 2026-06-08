import { createContext, useContext, useState, type ReactNode } from "react";

export interface DragState {
  instanceId: number;
  fromCategoryId: number;
  instanceName: string;
}

interface DragContextValue {
  dragging: DragState | null;
  setDragging: (state: DragState | null) => void;
}

const DragContext = createContext<DragContextValue>({
  dragging: null,
  setDragging: () => {},
});

export function DragProvider({ children }: { children: ReactNode }) {
  const [dragging, setDragging] = useState<DragState | null>(null);
  return (
    <DragContext.Provider value={{ dragging, setDragging }}>
      {children}
    </DragContext.Provider>
  );
}

export function useDrag() {
  return useContext(DragContext);
}

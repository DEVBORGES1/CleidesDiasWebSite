import { useState, type DragEvent } from 'react';

/**
 * Reordenação por arrastar e soltar (HTML5). Devolve propriedades para cada
 * item e o estado visual. A ordem final é enviada por `onReorder` com os ids.
 */
export function useDragReorder<T extends { id: string }>(items: T[], onReorder: (ids: string[]) => void, enabled = true) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const itemProps = (item: T) =>
    enabled
      ? {
          draggable: true,
          onDragStart: (e: DragEvent) => {
            setDragId(item.id);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.id);
          },
          onDragOver: (e: DragEvent) => {
            if (!dragId) return;
            e.preventDefault();
            if (overId !== item.id) setOverId(item.id);
          },
          onDrop: (e: DragEvent) => {
            e.preventDefault();
            if (dragId && dragId !== item.id) {
              const ids = items.map((i) => i.id);
              const from = ids.indexOf(dragId);
              const to = ids.indexOf(item.id);
              ids.splice(to, 0, ids.splice(from, 1)[0]!);
              onReorder(ids);
            }
            setDragId(null);
            setOverId(null);
          },
          onDragEnd: () => {
            setDragId(null);
            setOverId(null);
          },
        }
      : {};

  return {
    itemProps,
    isDragging: (id: string) => dragId === id,
    isOver: (id: string) => overId === id && dragId !== id,
  };
}

/** Move um item para outra posição (usado pelo seletor "Posição no site"). */
export function moveTo(ids: string[], id: string, index: number): string[] {
  const next = ids.filter((x) => x !== id);
  next.splice(Math.max(0, Math.min(index, next.length)), 0, id);
  return next;
}

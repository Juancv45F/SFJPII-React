import { RefObject, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Drag and drop de archivos sobre una vista (solo web; en nativo no existe esta interacción).
export function useFileDrop(ref: RefObject<unknown>, onFile: (file: File) => void, enabled = true) {
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const node = ref.current as HTMLElement | null;
    if (Platform.OS !== 'web' || !enabled || !node?.addEventListener) return;
    let depth = 0;
    const stop = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const enter = (e: DragEvent) => { stop(e); depth++; setDragging(true); };
    const over = (e: DragEvent) => { stop(e); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; };
    const leave = (e: DragEvent) => { stop(e); depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const drop = (e: DragEvent) => {
      stop(e);
      depth = 0;
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) onFile(file);
    };
    node.addEventListener('dragenter', enter);
    node.addEventListener('dragover', over);
    node.addEventListener('dragleave', leave);
    node.addEventListener('drop', drop);
    return () => {
      node.removeEventListener('dragenter', enter);
      node.removeEventListener('dragover', over);
      node.removeEventListener('dragleave', leave);
      node.removeEventListener('drop', drop);
    };
  }, [ref, onFile, enabled]);
  return dragging;
}

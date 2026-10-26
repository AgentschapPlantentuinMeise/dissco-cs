import React from 'react';

// A bar to drag between two columns of the annotate page (image and form, form and panel). While
// dragging, it reports where the pointer is; the caller turns that into a width.
export function ResizeHandle({ onDrag }: { onDrag: (clientX: number) => void }) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => onDrag(ev.clientX);
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div
      className="group w-[6px] flex-shrink-0 cursor-col-resize bg-gray-300 flex items-center justify-center transition-colors duration-150 select-none hover:bg-cs-primary active:bg-cs-primary"
      onMouseDown={handleMouseDown}
    >
      <span className="block w-[2px] h-8 bg-black/25 rounded-sm group-hover:bg-white/50" />
    </div>
  );
}

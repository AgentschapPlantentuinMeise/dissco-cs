// openseadragon@4.1.1 ships no TypeScript types and no @types package exists for this version
// (the published @types/openseadragon is an empty stub). Minimal local declaration covering
// only the API surface used in OpenSeadragonViewer.tsx.
declare module 'openseadragon' {
  namespace OpenSeadragon {
    class Point {
      constructor(x?: number, y?: number);
      x: number;
      y: number;
    }

    class Rect {
      constructor(x?: number, y?: number, width?: number, height?: number);
    }

    interface MouseTrackerEvent {
      position: Point;
    }

    class MouseTracker {
      constructor(options: {
        element: Element;
        pressHandler?: (event: MouseTrackerEvent) => void;
        dragHandler?: (event: MouseTrackerEvent) => void;
        releaseHandler?: (event: MouseTrackerEvent) => void;
      });
      destroy(): void;
    }

    interface Viewport {
      setRotation(degrees: number): void;
      viewerElementToImageCoordinates(pixel: Point): Point;
      imageToViewportRectangle(rect: Rect): Rect;
    }

    interface Viewer {
      viewport: Viewport;
      canvas: HTMLElement;
      addOverlay(element: HTMLElement, location: Rect): void;
      updateOverlay(element: HTMLElement, location: Rect): void;
      removeOverlay(element: HTMLElement): void;
      setMouseNavEnabled(enabled: boolean): void;
      destroy(): void;
    }

    interface Options {
      element: HTMLElement;
      tileSources: string;
      showNavigationControl?: boolean;
      gestureSettingsMouse?: { clickToZoom?: boolean };
    }
  }

  function OpenSeadragon(options: OpenSeadragon.Options): OpenSeadragon.Viewer;

  export = OpenSeadragon;
}

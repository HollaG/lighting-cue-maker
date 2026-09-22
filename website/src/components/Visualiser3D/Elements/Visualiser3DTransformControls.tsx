// File written by AI, I don't really know how to fix
// the issue.
//
// The issue being:
/**
 * When I click on the TransformControls and I let go, with e.g. a Cuboid behind the mouse when I let go, the Cuboid's onClick actually fires. It shouldn't be like this.
 * BTW worth noting that the onClick event for TransformControls nver fires (but the onMouseUp does)
 *
 * Two separate event systems were responding to the same mouse gesture:
 * 1. TransformControls uses its own DOM listeners and raycasting to detect its handles. Releasing a handle fires its custom mouseUp event.
 * 2. React Three Fiber separately receives the browser’s subsequent click, raycasts the scene, and calls the cuboid’s onClick.
 * The gizmo handling the drag doesn’t automatically consume that browser click. Visually, it appears above the cuboid, but that doesn’t make it block R3F’s event handling.
 * Your onClick on <TransformControls> didn’t help because Drei attaches that prop to a separate group—not the gizmo. With object={mesh} and no children, that group has nothing to raycast against.
 * The fix explicitly connects those two systems: when the gizmo handles a press, we intercept its resulting browser click before R3F processes it.
 */

import { TransformControls, type TransformControlsProps } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

/** Keeps a gizmo interaction from clicking scene objects when the pointer is released. */
export const Visualiser3DTransformControls = ({ onMouseDown, ...props }: TransformControlsProps) => {
  const eventSource = useThree((state) => state.events.connected ?? state.gl.domElement);
  const suppressClick = useRef(false);

  useEffect(() => {
    // A new press resets the guard even if the previous gesture produced no click.
    const onPointerDown = () => {
      suppressClick.current = false;
    };
    const onClick = (event: Event) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.stopImmediatePropagation();
    };

    // Capture the native click before R3F raycasts and dispatches it to scene meshes.
    eventSource.addEventListener("pointerdown", onPointerDown, true);
    eventSource.addEventListener("click", onClick, true);
    return () => {
      eventSource.removeEventListener("pointerdown", onPointerDown, true);
      eventSource.removeEventListener("click", onClick, true);
      suppressClick.current = false;
    };
  }, [eventSource]);

  return (
    <TransformControls
      {...props}
      onMouseDown={(event) => {
        // This event only fires when TransformControls actually grabs a gizmo handle.
        suppressClick.current = true;
        onMouseDown?.(event);
      }}
    />
  );
};

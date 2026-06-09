---
name: Mobile PanResponder in ScrollView
description: How to implement drag-and-drop inside a parent ScrollView on React Native / Expo.
---

**Problem:** A drag handle inside a ScrollView competes with the parent's scroll gesture. Simply adding PanResponder to a child won't prevent scroll.

**Solution:** Use `onStartShouldSetPanResponder: () => true` on the drag handle View. This claims the gesture from the very first touch — before the parent ScrollView can begin scrolling. The key is that the PanResponder is spread only onto the drag handle (not the entire row), so touching non-handle areas still allows normal scrolling.

**Why:** React Native's gesture responder system is first-come-first-served at touch start. `onStartShouldSetPanResponder` fires before `onMoveShouldSetPanResponder` (which ScrollView uses), so returning true here wins the gesture.

**Stale closure pattern:** PanResponder is created once via `useRef(PanResponder.create({...})).current`. Callbacks captured inside will be stale after re-renders. Fix with a `callbacksRef`:

```tsx
const callbacksRef = useRef(callbacks);
useEffect(() => { callbacksRef.current = callbacks; }); // no deps — always sync

const panResponder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => callbacksRef.current.onStart(id),
    onPanResponderMove: (_, gs) => callbacksRef.current.onMove(gs.dy),
    onPanResponderRelease: (_, gs) => callbacksRef.current.onRelease(id, gs.dy),
    onPanResponderTerminate: () => callbacksRef.current.onCancel(),
  })
).current;
```

**Index tracking:** Use a `localOrderRef` (ref mirroring `localOrder` state) and compute `startIndex = localOrderRef.current.indexOf(id)` at drag-start time. Use `ITEM_HEIGHT` constant (~70px) to compute step count from `gs.dy`.

**Hover indicator:** Show a 2px colored `borderTopWidth` on the target item (tracked via `hoverIndex` state) as visual drop-zone feedback.

/**
 * Shared helpers for the help mode steps used by `HelpModeTour` and `HelpModeHover`.
 */

/**
 * The areas a help step can belong to, in display order.
 * A step sets its `area` to one of the keys.
 */
const HELP_MODE_AREAS = [
  { key: 'toolbar', label: 'Toolbar' },
  { key: 'panel-header', label: 'Panel header' },
  { key: 'map-info', label: 'Map info' },
  { key: 'legends', label: 'Legends & layers' },
  { key: 'zoom', label: 'Zoom' },
  { key: 'map-settings', label: 'Map settings' },
  { key: 'drawing', label: 'Drawing' },
  { key: 'animation', label: 'Animation' },
];

const resolveTarget = (step) => {
  if (!step?.target) return undefined;
  return typeof step.target === 'function' ? step.target() : step.target;
};

// The help overlays, ignored when looking for what covers a target
const OVERLAY_SELECTOR = '.help-mode-hover, .help-mode-hover__popper, .el-tour';
// Set on a target while looking for what covers it, so it receives the hit test even with
// `pointer-events: none`, e.g. a map popup or a disabled control, see the style in `HelpModeTour`
const HIT_TEST_CLASS = 'help-mode-hit-test';

const getCheckPoints = (el) => {
  const { left, top, right, bottom } = el.getBoundingClientRect();
  const inset = Math.min(2, (right - left) / 2, (bottom - top) / 2);
  return [
    [(left + right) / 2, (top + bottom) / 2],
    [left + inset, top + inset],
    [right - inset, top + inset],
    [left + inset, bottom - inset],
    [right - inset, bottom - inset],
  ].filter(([x, y]) => x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight);
};

/**
 * Returns the element on top of `el` at the point, ignoring the help overlays and
 * the elements inside `hidden`, or undefined if `el` is on top.
 * The elements at the point are in stacking order, only the ones before `el` are on top of it,
 * the ones after it, e.g. the map canvas under a map popup, are behind it.
 */
const getCoveringElementAt = (el, x, y, hidden = []) => {
  el.classList.add(HIT_TEST_CLASS);
  const elements = document.elementsFromPoint(x, y);
  el.classList.remove(HIT_TEST_CLASS);
  for (const element of elements) {
    if (element.closest(OVERLAY_SELECTOR) || hidden.some((other) => other.contains(element))) {
      continue;
    }
    // `el` is reached first, or an ancestor is found for a part of `el` without pointer events
    if (el.contains(element) || element.contains(el)) return undefined;
    return element;
  }
  // `el` is not at the point, e.g. outside of a rounded corner
  return undefined;
};

/**
 * Whether other elements are on top of the element, e.g. a map feature behind a drawer.
 * The centre and the corners are checked, a partly visible element is not covered.
 * Points outside of the window are unknown, an element scrolled out of view is not covered.
 */
const isCovered = (el) => {
  const points = getCheckPoints(el);
  return points.length > 0 && points.every(([x, y]) => getCoveringElementAt(el, x, y));
};

/**
 * Returns the elements on top of any part of the element, e.g. the legends in front of a map.
 * Each one is the outermost help item containing what is on top, e.g. the legends rather than
 * one of its items, or else the outermost ancestor of what is on top which does not contain
 * the element.
 */
const getCoveringElements = (el) => {
  const covering = [];
  getCheckPoints(el).forEach(([x, y]) => {
    let topmost = getCoveringElementAt(el, x, y, covering);
    // Bounded, in case several elements are on top of each other
    for (let i = 0; topmost && i < 5; i++) {
      let outermost = topmost;
      // The outermost help item, set by `v-help-mode`, e.g. the legends rather than the drawer
      let outermostHelpItem = topmost.hasAttribute('data-help-id') ? topmost : undefined;
      while (outermost.parentElement && !outermost.parentElement.contains(el)) {
        outermost = outermost.parentElement;
        if (outermost.hasAttribute('data-help-id')) outermostHelpItem = outermost;
      }
      covering.push(outermostHelpItem ?? outermost);
      topmost = getCoveringElementAt(el, x, y, covering);
    }
  });
  return covering;
};

/**
 * Whether the target of the step can be shown. With `checkCovered`, a target behind
 * other elements is not available, e.g. for the hover help which only shows what is visible,
 * the tour shows it and hides what covers it.
 */
const isStepAvailable = (step, { checkCovered = false } = {}) => {
  if (!step?.target) return true;
  const el = resolveTarget(step);
  if (!el || !el.isConnected || el.getClientRects().length === 0) return false;
  return !(checkCovered && isCovered(el));
};

/**
 * Where to mount the overlays, inside the fullscreen element when there is one
 * as anything outside of it is not visible.
 */
const getOverlayParent = () => document.fullscreenElement || 'body';

/**
 * Returns the areas, in display order, with at least one step which can be shown.
 * Steps with `onEnter` are counted as their target may only appear after `onEnter`.
 */
const getHelpModeAreas = (steps) => {
  const keys = new Set(
    steps.filter((step) => step.onEnter || isStepAvailable(step)).map((step) => step.area),
  );
  return HELP_MODE_AREAS.filter((area) => keys.has(area.key));
};

export {
  HELP_MODE_AREAS,
  resolveTarget,
  isStepAvailable,
  getCoveringElements,
  getOverlayParent,
  getHelpModeAreas,
};

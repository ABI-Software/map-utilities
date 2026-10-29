/**
 * `v-help-mode` adds the element to the help mode, `HelpModeTour` and `HelpModeHover`.
 * Add the directive to a control to show its help, remove it to hide it.
 *
 *   <div v-help-mode="{ id: 'zoom-in', area: 'zoom', title: 'Zoom in', description: '...' }">
 *
 * The value is a help step, see `HelpModeTour` for its shape. `target` defaults to the
 * element. Register it in the component with `directives: { helpMode: helpModeDirective }`,
 * then use `collectHelpModeSteps(root)` to get the steps of the elements under `root`.
 * The value is reactive, e.g. a description can depend on the component state.
 */
import { HELP_MODE_AREAS } from './helpModeUtils.js';

const HELP_ID_ATTRIBUTE = 'data-help-id';

// Help step of each element with the directive
const helpModeValues = new WeakMap();

const areaKeys = new Set(HELP_MODE_AREAS.map((area) => area.key));

const register = (el, value) => {
  if (!value?.id) {
    console.warn('v-help-mode: an id is required', el);
    return;
  }
  if (value.area && !areaKeys.has(value.area)) {
    console.warn(`v-help-mode: unknown area "${value.area}" for "${value.id}"`);
  }
  helpModeValues.set(el, value);
  el.setAttribute(HELP_ID_ATTRIBUTE, value.id);
};

const helpModeDirective = {
  mounted: function (el, { value }) {
    register(el, value);
  },
  updated: function (el, { value }) {
    register(el, value);
  },
  unmounted: function (el) {
    helpModeValues.delete(el);
  },
};

const areaOrder = new Map(HELP_MODE_AREAS.map((area, index) => [area.key, index]));

const isHidden = (el) => !el.isConnected || el.getClientRects().length === 0;

/**
 * Returns the help steps of `root` and the elements under it with `v-help-mode`,
 * sorted by area, then by their optional `order`, then by their position in the page.
 *
 * Elements inside a hidden help scope, an element with `data-help-scope` such as
 * a viewer which is not shown, are left out, so their `onEnter` is never called.
 */
const collectHelpModeSteps = (root) => {
  if (!root?.querySelectorAll) return [];
  const elements = [...root.querySelectorAll(`[${HELP_ID_ATTRIBUTE}]`)];
  if (root.hasAttribute?.(HELP_ID_ATTRIBUTE)) elements.unshift(root);
  return elements
    .map((el, position) => ({ el, position, value: helpModeValues.get(el) }))
    .filter(({ el, value }) => {
      if (!value) return false;
      const scope = el.closest('[data-help-scope]');
      return !scope || !isHidden(scope);
    })
    .sort(
      (a, b) =>
        (areaOrder.get(a.value.area) ?? areaOrder.size) -
          (areaOrder.get(b.value.area) ?? areaOrder.size) ||
        (a.value.order ?? 0) - (b.value.order ?? 0) ||
        a.position - b.position,
    )
    .map(({ el, value }) => ({
      ...value,
      // The element can be replaced when the component re-renders
      target:
        value.target ??
        (() => (el.isConnected ? el : root.querySelector(`[${HELP_ID_ATTRIBUTE}="${value.id}"]`))),
    }));
};

export { helpModeDirective, collectHelpModeSteps };

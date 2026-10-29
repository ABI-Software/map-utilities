<template>
  <teleport :to="appendTo">
    <div v-if="modelValue" class="help-mode-hover" :style="{ zIndex }">
      <svg class="help-mode-hover__mask" :viewBox="`0 0 ${viewport.width} ${viewport.height}`">
        <path :d="maskPath" fill-rule="evenodd" />
        <path class="help-mode-hover__outline" :d="outlinePath" />
        <!-- Catches the mouse over the whole area, including the highlighted controls -->
        <rect
          class="help-mode-hover__shield"
          :x="area.left"
          :y="area.top"
          :width="Math.max(area.right - area.left, 0)"
          :height="Math.max(area.bottom - area.top, 0)"
        />
      </svg>
      <div class="help-mode-hover__banner" :style="bannerStyle">
        <el-icon class="help-mode-hover__icon"><el-icon-pointer /></el-icon>
        <strong>Hover help</strong>
        <span>Point at a highlighted control to see what it does.</span>
        <el-button size="small" class="help-mode-hover__exit" @click="close">Exit</el-button>
      </div>
      <el-popover
        :visible="popoverVisible"
        :virtual-ref="currentElement"
        virtual-triggering
        :placement="currentStep?.placement || 'bottom'"
        :width="320"
        :popper-style="{ zIndex: zIndex + 1 }"
        :append-to="appendTo"
        popper-class="help-mode-hover__popper"
      >
        <div v-if="currentStep">
          <div class="help-mode-tour__header">
            <span v-if="currentStep.group" class="help-mode-tour__group" :title="currentStep.group">
              {{ currentStep.group }}
            </span>
            <span class="help-mode-tour__title">{{ currentStep.title }}</span>
          </div>
          <div class="help-mode-hover__description">{{ currentStep.description }}</div>
        </div>
      </el-popover>
    </div>
  </teleport>
</template>

<script>
/**
 * The reverse of `HelpModeTour`: the container is greyed out except the controls
 * with help, which are outlined. Hovering over one of them shows its help.
 * Nothing in the container can be used while it is on, including the highlighted controls,
 * so the focus is on their help; "Exit" or Escape leaves it. The page outside the container,
 * e.g. when the viewer is embedded in a longer page, can still be used and scrolled.
 *
 * It uses the same steps as `HelpModeTour`. Steps without a target or with
 * `hover: false` are ignored. `onEnter` of all the steps is called when the
 * hover help starts, to show their targets, and `onLeave` when it stops.
 * Press Escape or click "Exit" to leave.
 */
import { Pointer as ElIconPointer } from '@element-plus/icons-vue';
import { resolveTarget, isStepAvailable, getOverlayParent } from '../HelpModeTour/helpModeUtils.js';

const TARGET_CLASS = 'help-mode-hover-target';
// Set on the root element while a target is under the mouse, the shield in front of
// the targets inherits the cursor
const OVER_CLASS = 'help-mode-hover-over';
// Space around a target, its outline is drawn on the edge of its hole
const HOLE_PADDING = 4;
// Edges closer than this are drawn as one line
const EDGE_TOLERANCE = 0.5;
// Targets can move without a mouse event, e.g. an opening drawer
const REFRESH_INTERVAL = 250;
// Distance of the banner from the top of the visible part of the container, the banner
// is small enough to stay within a toolbar at the top, e.g. the 32px toolbar of the maps viewer,
// so it does not cover the controls below it such as the panel headers
const BANNER_OFFSET = 2;

const isInside = (inner, outer) =>
  inner.left >= outer.left &&
  inner.top >= outer.top &&
  inner.right <= outer.right &&
  inner.bottom <= outer.bottom;

const pad = ({ left, top, right, bottom }, padding) => ({
  left: left - padding,
  top: top - padding,
  right: right + padding,
  bottom: bottom + padding,
});

const intersect = (a, b) => ({
  left: Math.max(a.left, b.left),
  top: Math.max(a.top, b.top),
  right: Math.min(a.right, b.right),
  bottom: Math.min(a.bottom, b.bottom),
});

const isEmpty = ({ left, top, right, bottom }) => right <= left || bottom <= top;

const rectPath = ({ left, top, right, bottom }) => `M${left},${top}H${right}V${bottom}H${left}z`;

const boxesOverlap = (a, b) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * When the padded boxes of two targets next to each other overlap, move their facing
 * edges to the middle of the gap between the targets, so the boxes share an edge.
 * Overlapping holes would cancel out with the even-odd rule and show the mask between them.
 */
const separate = (a, b) => {
  if (!boxesOverlap(a.box, b.box)) return;
  const gapX = Math.max(b.rect.left - a.rect.right, a.rect.left - b.rect.right);
  const gapY = Math.max(b.rect.top - a.rect.bottom, a.rect.top - b.rect.bottom);
  // The targets themselves overlap
  if (gapX < 0 && gapY < 0) return;
  if (gapX >= gapY) {
    const [left, right] = a.rect.right <= b.rect.left ? [a, b] : [b, a];
    const middle = (left.rect.right + right.rect.left) / 2;
    left.box.right = Math.min(left.box.right, middle);
    right.box.left = Math.max(right.box.left, middle);
  } else {
    const [top, bottom] = a.rect.bottom <= b.rect.top ? [a, b] : [b, a];
    const middle = (top.rect.bottom + bottom.rect.top) / 2;
    top.box.bottom = Math.min(top.box.bottom, middle);
    bottom.box.top = Math.max(bottom.box.top, middle);
  }
};

/**
 * Returns the path of the edges of the boxes, the edges on the same line are joined,
 * so a shared edge between two boxes is drawn once. Each joined edge is its own subpath,
 * the dashes restart on each of them and line up.
 */
const edgesPath = (boxes) => {
  const lines = { V: new Map(), H: new Map() };
  const add = (direction, position, start, end) => {
    const key = Math.round(position / EDGE_TOLERANCE) * EDGE_TOLERANCE;
    if (!lines[direction].has(key)) lines[direction].set(key, []);
    lines[direction].get(key).push([start, end]);
  };
  boxes.forEach(({ left, top, right, bottom }) => {
    add('V', left, top, bottom);
    add('V', right, top, bottom);
    add('H', top, left, right);
    add('H', bottom, left, right);
  });
  const path = [];
  Object.entries(lines).forEach(([direction, positions]) => {
    positions.forEach((segments, position) => {
      segments.sort((a, b) => a[0] - b[0]);
      const joined = [];
      segments.forEach(([start, end]) => {
        const last = joined[joined.length - 1];
        if (last && start <= last[1] + EDGE_TOLERANCE) {
          last[1] = Math.max(last[1], end);
        } else {
          joined.push([start, end]);
        }
      });
      joined.forEach(([start, end]) => {
        path.push(
          direction === 'V' ? `M${position},${start}V${end}` : `M${start},${position}H${end}`,
        );
      });
    });
  });
  return path.join('');
};

export default {
  name: 'HelpModeHover',
  components: {
    ElIconPointer,
  },
  props: {
    /**
     * Show or hide the hover help (v-model).
     */
    modelValue: {
      type: Boolean,
      default: false,
    },
    /**
     * The list of help steps, see `HelpModeTour` for the shape.
     */
    steps: {
      type: Array,
      default: () => [],
    },
    /**
     * The element to grey out, or a function returning it. Defaults to the whole window.
     */
    container: {
      type: [Object, Function],
      default: undefined,
    },
    /**
     * z-index of the banner and the popover.
     */
    zIndex: {
      type: Number,
      default: 3000,
    },
  },
  emits: ['update:modelValue', 'change', 'close'],
  data: function () {
    return {
      // The last hovered step, kept while the popover fades out so it keeps its content and position
      currentStep: null,
      currentElement: null,
      popoverVisible: false,
      holes: [],
      outlinePath: '',
      // The greyed out area, in viewport coordinates
      area: { left: 0, top: 0, right: 0, bottom: 0 },
      viewport: { width: 0, height: 0 },
      appendTo: 'body',
    };
  },
  computed: {
    maskPath: function () {
      const { left, top, right, bottom } = this.area;
      const outer = `M${left},${top}H${right}V${bottom}H${left}z`;
      return [outer, ...this.holes.map(rectPath)].join('');
    },
    bannerStyle: function () {
      const visible = intersect(this.area, {
        left: 0,
        top: 0,
        right: this.viewport.width,
        bottom: this.viewport.height,
      });
      return {
        top: `${Math.max(visible.top, 0) + BANNER_OFFSET}px`,
        left: `${(visible.left + visible.right) / 2}px`,
      };
    },
  },
  watch: {
    modelValue: {
      handler: function (value) {
        if (value) {
          this.start();
        } else {
          this.stop();
        }
      },
      immediate: true,
    },
  },
  created: function () {
    this.outlined = new Set();
    this.refreshRequest = 0;
    this.moveRequest = 0;
    this.refreshTimer = 0;
  },
  beforeUnmount: function () {
    this.stop();
  },
  methods: {
    hoverSteps: function () {
      return this.steps.filter((step) => step.target && step.hover !== false);
    },
    start: function () {
      this.appendTo = getOverlayParent();
      this.enteredSteps = this.hoverSteps();
      this.enteredSteps.forEach((step) => step.onEnter?.());
      document.addEventListener('mousemove', this.onMouseMove, { capture: true, passive: true });
      document.addEventListener('keydown', this.onKeyDown, true);
      document.addEventListener('scroll', this.requestRefresh, { capture: true, passive: true });
      document.addEventListener('fullscreenchange', this.onFullscreenChange);
      window.addEventListener('resize', this.requestRefresh);
      this.refreshTimer = setInterval(this.refreshTargets, REFRESH_INTERVAL);
      this.$nextTick(() => this.refreshTargets());
    },
    stop: function () {
      document.documentElement.classList.remove(OVER_CLASS);
      document.removeEventListener('mousemove', this.onMouseMove, { capture: true });
      cancelAnimationFrame(this.moveRequest);
      document.removeEventListener('keydown', this.onKeyDown, true);
      document.removeEventListener('scroll', this.requestRefresh, { capture: true });
      document.removeEventListener('fullscreenchange', this.onFullscreenChange);
      window.removeEventListener('resize', this.requestRefresh);
      clearInterval(this.refreshTimer);
      cancelAnimationFrame(this.refreshRequest);
      this.enteredSteps?.forEach((step) => step.onLeave?.());
      this.enteredSteps = [];
      this.outlined?.forEach((el) => el.classList.remove(TARGET_CLASS));
      this.outlined?.clear();
      this.popoverVisible = false;
      this.currentStep = null;
      this.currentElement = null;
      this.holes = [];
      this.outlinePath = '';
    },
    /**
     * Outline the available targets and cut a hole in the mask for each of them,
     * targets may appear or disappear while the user interacts with the page,
     * e.g. when a drawer is opened.
     */
    refreshTargets: function () {
      const elements = new Set(
        this.hoverSteps()
          .filter((step) => isStepAvailable(step, { checkCovered: true }))
          .map((step) => resolveTarget(step)),
      );
      this.outlined.forEach((el) => {
        if (!elements.has(el)) el.classList.remove(TARGET_CLASS);
      });
      elements.forEach((el) => el.classList.add(TARGET_CLASS));
      this.outlined = elements;
      this.updateHoles(elements);
    },
    getArea: function () {
      const container = typeof this.container === 'function' ? this.container() : this.container;
      if (container?.getBoundingClientRect) {
        const { left, top, right, bottom } = container.getBoundingClientRect();
        return { left, top, right, bottom };
      }
      return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    },
    /**
     * Cut a hole in the mask for each target and outline it, the boxes of targets next to
     * each other share an edge. Only the outermost boxes get a hole, the nested ones are
     * already uncovered and overlapping holes would cancel out with the even-odd rule.
     * Holes are kept inside the greyed out area for the same reason.
     */
    updateHoles: function (elements) {
      const area = this.getArea();
      const items = [...elements].map((el) => {
        const { left, top, right, bottom } = el.getBoundingClientRect();
        const rect = { left, top, right, bottom };
        return { rect, box: pad(rect, HOLE_PADDING) };
      });
      items.forEach((item, index) => {
        items.slice(index + 1).forEach((other) => {
          // A nested target is inside the hole of its container
          if (isInside(item.rect, other.rect) || isInside(other.rect, item.rect)) return;
          separate(item, other);
        });
      });
      const boxes = items.map(({ box }) => intersect(box, area)).filter((box) => !isEmpty(box));
      this.holes = boxes.filter(
        (box, index) =>
          !boxes.some(
            (other, otherIndex) =>
              otherIndex !== index &&
              isInside(box, other) &&
              // keep one of identical boxes
              !(isInside(other, box) && otherIndex > index),
          ),
      );
      this.outlinePath = edgesPath(boxes);
      this.area = area;
      this.viewport = { width: window.innerWidth, height: window.innerHeight };
    },
    requestRefresh: function () {
      cancelAnimationFrame(this.refreshRequest);
      this.refreshRequest = requestAnimationFrame(() => this.refreshTargets());
    },
    /**
     * Find the step of the innermost target containing the element.
     */
    /**
     * Find the step of the innermost target at the position. The position is used
     * rather than the element under the mouse, as disabled controls often have
     * `pointer-events: none` and never receive the mouse, but their help is still shown.
     */
    findStepAt: function (x, y) {
      const matches = this.hoverSteps()
        .map((step) => ({ step, el: resolveTarget(step) }))
        // Only the highlighted targets, they are checked in `refreshTargets`
        .filter(({ el }) => this.outlined.has(el))
        .map(({ step, el }) => {
          const { left, top, right, bottom } = el.getBoundingClientRect();
          return { step, el, left, top, right, bottom, size: (right - left) * (bottom - top) };
        })
        .filter(
          ({ left, top, right, bottom }) => x >= left && x <= right && y >= top && y <= bottom,
        );
      return matches.reduce(
        (smallest, match) => (!smallest || match.size < smallest.size ? match : smallest),
        null,
      );
    },
    onMouseMove: function (event) {
      if (!this.modelValue) return;
      const { clientX, clientY, target } = event;
      cancelAnimationFrame(this.moveRequest);
      this.moveRequest = requestAnimationFrame(() => this.updateHover(clientX, clientY, target));
    },
    updateHover: function (x, y, element) {
      if (element?.closest?.('.help-mode-hover__popper, .help-mode-hover__banner')) return;
      // Only in the greyed out area, the targets can be partly outside of it
      const { left, top, right, bottom } = this.area;
      const inArea = x >= left && x <= right && y >= top && y <= bottom;
      const match = inArea ? this.findStepAt(x, y) : null;
      document.documentElement.classList.toggle(OVER_CLASS, !!match);
      if (!match) {
        this.popoverVisible = false;
        return;
      }
      if (this.popoverVisible && match.step === this.currentStep) return;
      this.currentStep = match.step;
      this.currentElement = match.el;
      this.popoverVisible = true;
      this.$emit('change', match.step);
    },
    onFullscreenChange: function () {
      this.appendTo = getOverlayParent();
      this.requestRefresh();
    },
    onKeyDown: function (event) {
      if (event.key === 'Escape') this.close();
    },
    close: function () {
      this.$emit('close', this.currentStep);
      this.$emit('update:modelValue', false);
    },
  },
};
</script>

<style lang="scss">
html.help-mode-hover-over {
  cursor: help;
}

.help-mode-hover__mask {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: inherit;
  // Only the shield catches the mouse, the page outside of the greyed out area can be used
  pointer-events: none;

  path {
    fill: rgba(0, 0, 0, 0.5);
    pointer-events: auto;
  }

  // Transparent, so the controls cannot be used while the hover help is on,
  // the cursor follows the root element, e.g. the help cursor over a highlighted control
  .help-mode-hover__shield {
    fill: transparent;
    pointer-events: all;
    cursor: inherit;
  }

  .help-mode-hover__outline {
    fill: none;
    stroke: $app-primary-color;
    stroke-width: 2;
    stroke-dasharray: 6 4;
    pointer-events: none;
  }
}

.help-mode-hover__banner {
  position: fixed;
  transform: translateX(-50%);
  z-index: inherit;
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  height: 28px;
  padding: 0 3px 0 12px;
  font-family: $font-family;
  font-size: 12px;
  white-space: nowrap;
  // Solid, the opposite of the help items which are outlined holes in the mask
  color: white;
  background-color: $app-primary-color;
  border: 1px solid $app-primary-color;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);

  .help-mode-hover__icon {
    font-size: 14px;
  }

  strong {
    font-weight: 500;
  }

  .help-mode-hover__exit.el-button {
    height: 22px;
    padding: 0 10px;
    font-family: inherit;
    font-size: 12px;
    color: $app-primary-color;
    background-color: white;
    border-color: white;

    &:hover {
      color: $app-primary-color;
      background-color: #f3e6f9;
      border-color: #f3e6f9;
    }
  }
}

.el-popover.el-popper.help-mode-hover__popper {
  padding: 16px;
  font-family: $font-family;
  border: 1px solid $app-primary-color;
  border-radius: 4px;
  pointer-events: none;

  .el-popper__arrow::before {
    border-color: $app-primary-color;
  }

  .help-mode-hover__description {
    margin-top: 8px;
    font-size: 14px;
    line-height: 1.5;
    color: $grey;
  }
}
</style>

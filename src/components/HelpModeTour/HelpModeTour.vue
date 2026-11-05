<template>
  <el-tour
    class="help-mode-tour"
    :model-value="modelValue"
    :current="displayIndex"
    :z-index="zIndex"
    :append-to="appendTo"
    :target-area-clickable="false"
    :scroll-into-view-options="scrollIntoViewOptions"
    @update:current="onUpdateCurrent"
    @close="onClose"
    @finish="onFinish"
  >
    <el-tour-step
      v-for="(step, index) in activeSteps"
      :key="step.id || index"
      :target="index === displayIndex ? targetGetter : undefined"
      :title="step.title"
      :placement="step.placement || 'bottom'"
    >
      <div
        class="help-mode-tour__description"
        v-html="sanitizeHelpDescription(step.description)"
      ></div>
      <template #header>
        <div class="help-mode-tour__header">
          <span v-if="step.group" class="help-mode-tour__group" :title="step.group">
            {{ step.group }}
          </span>
          <span class="help-mode-tour__title">{{ step.title }}</span>
        </div>
      </template>
    </el-tour-step>
    <template #indicators="{ current, total }">
      <span class="help-mode-tour__counter">{{ current + 1 }} / {{ total }}</span>
    </template>
  </el-tour>
</template>

<script>
/**
 * A single guided tour built on Element Plus `el-tour`.
 *
 * The steps usually come from the `v-help-mode` directive on the controls,
 * see `collectHelpModeSteps` in `helpModeDirective.js`.
 *
 * Each step is a plain object:
 * {
 *   id: String,
 *   title: String,
 *   description: String,         // can use some HTML, e.g. <b>, <p>, <ul><li>, see `sanitizeHelpDescription`
 *   placement: String,           // el-tour placement, defaults to 'bottom'
 *   group: String,               // optional label shown above the title, e.g. "Panel 2 · Flatmap"
 *   area: String,                // optional, one of the `HELP_MODE_AREAS` keys, e.g. 'zoom'
 *   order: Number,               // optional, the order within the area, defaults to the page order
 *   hover: Boolean,              // optional, false to exclude the step from `HelpModeHover`
 *   target: () => HTMLElement,   // optional, a step without target is shown in the centre
 *   onEnter: async () => {},     // optional, prepare the UI (open a drawer, a popup, ...)
 *   onLeave: () => {},           // optional, revert what onEnter did
 *   enterDelay: Number,          // optional, ms to wait after onEnter, e.g. for an animation
 *   leaveDelay: Number,          // optional, ms to wait after onLeave before the next step
 *   hoverEnter: Boolean,         // optional, false to only call onEnter/onLeave in the tour,
 *                                // e.g. a list which would cover other controls in `HelpModeHover`
 * }
 *
 * Steps with a missing or hidden target are removed, so the step counter has no gaps.
 * Steps with `onEnter` are only removed if their target is still unavailable after it.
 *
 * The viewer can be embedded in a page which scrolls, the highlight follows the
 * target when the page is scrolled.
 *
 * The highlighted controls cannot be used while the tour is on, as for `HelpModeHover`,
 * the focus is on their help.
 *
 * A target behind other elements, e.g. a map feature behind a drawer, is still shown:
 * what covers it is made transparent while the step is shown, nothing else is changed.
 */
import {
  resolveTarget,
  isStepAvailable,
  getCoveringElements,
  getOverlayParent,
  sanitizeHelpDescription,
} from './helpModeUtils.js';

const ENTER_DELAY = 300;
// Set on the elements in front of the target of the current step
const UNCOVERED_CLASS = 'help-mode-tour-uncovered';
// Scroll the page as little as possible to show an off-screen target,
// the containers inside the viewer are not scrolled if the target is visible in them.
const SCROLL_INTO_VIEW_OPTIONS = { block: 'nearest', inline: 'nearest' };

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  name: 'HelpModeTour',
  props: {
    /**
     * Show or hide the tour (v-model).
     */
    modelValue: {
      type: Boolean,
      default: false,
    },
    /**
     * The list of help steps, see the component description for the shape.
     */
    steps: {
      type: Array,
      default: () => [],
    },
    /**
     * z-index of the mask and the tooltip.
     */
    zIndex: {
      type: Number,
      default: 3000,
    },
  },
  emits: ['update:modelValue', 'change', 'finish', 'close', 'empty'],
  data: function () {
    return {
      activeSteps: [],
      displayIndex: 0,
      // Increased on every navigation so stale async transitions are discarded.
      transitionId: 0,
      // Target of the current step, replaced on scroll so el-tour updates the highlight.
      targetGetter: undefined,
      appendTo: 'body',
      scrollIntoViewOptions: SCROLL_INTO_VIEW_OPTIONS,
    };
  },
  watch: {
    modelValue: function (value) {
      if (value) {
        this.start();
      } else {
        this.stop();
      }
    },
  },
  created: function () {
    this.scrollRequest = 0;
    this.uncovered = [];
    this.navigating = false;
  },
  mounted: function () {
    // Not an immediate watcher, it would start before `created`, which then resets the flags
    if (this.modelValue) this.start();
  },
  beforeUnmount: function () {
    this.stop();
  },
  methods: {
    isStepAvailable,
    sanitizeHelpDescription,
    start: async function () {
      this.appendTo = getOverlayParent();
      document.addEventListener('scroll', this.onScroll, { capture: true, passive: true });
      document.addEventListener('fullscreenchange', this.onFullscreenChange);
      this.activeSteps = this.steps.filter((step) => step.onEnter || isStepAvailable(step));
      this.displayIndex = 0;
      this.navigating = true;
      try {
        const found = await this.goTo(0, 1);
        // Not when the tour was stopped meanwhile, it may have been started again
        if (found === false) {
          // Nothing to show, e.g. an area whose controls are hidden
          this.$emit('empty');
          this.$emit('close');
          this.close();
        }
      } finally {
        this.navigating = false;
      }
    },
    stop: function () {
      document.removeEventListener('scroll', this.onScroll, { capture: true });
      document.removeEventListener('fullscreenchange', this.onFullscreenChange);
      cancelAnimationFrame(this.scrollRequest);
      this.unobserveTarget();
      this.restoreCovered();
      this.transitionId += 1;
      this.leaveStep(this.activeSteps[this.displayIndex]);
      this.activeSteps = [];
      this.displayIndex = 0;
      this.targetGetter = undefined;
    },
    enterStep: async function (step) {
      if (step?.onEnter) {
        await step.onEnter();
        await this.$nextTick();
        await wait(step.enterDelay ?? ENTER_DELAY);
      }
    },
    leaveStep: function (step) {
      this.unobserveTarget();
      this.restoreCovered();
      if (step?.onLeave) step.onLeave();
    },
    /**
     * Make the elements in front of the target of the current step transparent.
     */
    uncoverTarget: function () {
      this.restoreCovered();
      const el = resolveTarget(this.activeSteps[this.displayIndex]);
      if (!el?.isConnected) return;
      this.uncovered = getCoveringElements(el);
      this.uncovered.forEach((element) => element.classList.add(UNCOVERED_CLASS));
    },
    restoreCovered: function () {
      this.uncovered?.forEach((element) => element.classList.remove(UNCOVERED_CLASS));
      this.uncovered = [];
    },
    /**
     * Move to the first available step starting from `index` in `direction`,
     * unavailable steps on the way are removed. Returns true if a step was found,
     * false if there is none, null if the tour was stopped meanwhile.
     */
    goTo: async function (index, direction) {
      const id = ++this.transitionId;
      let i = index;
      while (i >= 0 && i < this.activeSteps.length) {
        const step = this.activeSteps[i];
        await this.enterStep(step);
        if (id !== this.transitionId) return null;
        if (this.isStepAvailable(step)) {
          this.displayIndex = i;
          this.updateTarget();
          this.uncoverTarget();
          this.observeTarget();
          this.$emit('change', step, i, direction);
          return true;
        }
        this.leaveStep(step);
        this.activeSteps.splice(i, 1);
        // Going forward, the next step is now at the same index
        if (direction < 0) i -= 1;
      }
      return false;
    },
    /**
     * Give el-tour a new target getter, so it measures the target again.
     */
    updateTarget: function () {
      const step = this.activeSteps[this.displayIndex];
      this.targetGetter = step?.target ? () => resolveTarget(step) : undefined;
    },
    /**
     * Measure the target again on the next frame, e.g. when the page is scrolled.
     */
    requestTargetUpdate: function () {
      cancelAnimationFrame(this.scrollRequest);
      this.scrollRequest = requestAnimationFrame(() => {
        this.updateTarget();
        // A target scrolled into view can be behind other elements
        this.uncoverTarget();
      });
    },
    onScroll: function () {
      this.requestTargetUpdate();
    },
    /**
     * el-tour measures the target once, measure it again when it changes while the step is
     * shown, e.g. a list which opens with an animation is measured before it is fully open.
     */
    observeTarget: function () {
      this.unobserveTarget();
      const el = resolveTarget(this.activeSteps[this.displayIndex]);
      if (!el?.isConnected) return;
      const update = () => this.requestTargetUpdate();
      el.addEventListener('transitionend', update);
      el.addEventListener('animationend', update);
      const resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(el);
      this.stopObservingTarget = () => {
        el.removeEventListener('transitionend', update);
        el.removeEventListener('animationend', update);
        resizeObserver.disconnect();
      };
    },
    unobserveTarget: function () {
      this.stopObservingTarget?.();
      this.stopObservingTarget = undefined;
    },
    onFullscreenChange: function () {
      this.appendTo = getOverlayParent();
    },
    onUpdateCurrent: async function (index) {
      // el-tour resets current to 0 when it is closed
      if (!this.modelValue || index === this.displayIndex) return;
      // Moving to a step can take a while, e.g. to open a drawer, the requests meanwhile
      // are ignored, e.g. the arrow keys pressed quickly
      if (this.navigating) return;
      this.navigating = true;
      try {
        const direction = index > this.displayIndex ? 1 : -1;
        const previous = this.activeSteps[this.displayIndex];
        this.leaveStep(previous);
        if (previous?.onLeave) {
          // What onLeave closes may still be on screen, e.g. a list closing with an animation,
          // it would be measured as covering the next target
          const id = this.transitionId;
          await wait(previous.leaveDelay ?? ENTER_DELAY);
          if (id !== this.transitionId) return;
        }
        const found = await this.goTo(index, direction);
        if (found || found === null) return;
        if (direction > 0) {
          // Nothing left to show, the tour is finished.
          this.onFinish();
          this.close();
        } else {
          // Nothing to go back to, stay on the current step,
          // its index has changed if the steps before it were removed.
          await this.goTo(this.activeSteps.indexOf(previous), 1);
        }
      } finally {
        this.navigating = false;
      }
    },
    onClose: function () {
      // el-tour emits 'close' right before 'finish' when the last step is completed,
      // wait a tick so only one of 'close' or 'finish' is emitted.
      const step = this.activeSteps[this.displayIndex];
      const index = this.displayIndex;
      this.finished = false;
      Promise.resolve().then(() => {
        if (!this.finished) this.$emit('close', step, index);
      });
      this.close();
    },
    onFinish: function () {
      this.finished = true;
      this.$emit('finish');
    },
    close: function () {
      this.$emit('update:modelValue', false);
    },
  },
};
</script>

<style lang="scss">
// A target while looking for what covers it, see `getCoveringElementAt` in `helpModeUtils.js`
.help-mode-hit-test,
.help-mode-hit-test * {
  pointer-events: auto !important;
}

// Elements in front of the target of the current step, e.g. a drawer in front of the map
.help-mode-tour-uncovered {
  opacity: 0 !important;
  transition: opacity 0.2s;
}

.help-mode-tour.el-tour {
  --el-tour-width: 320px;
  --el-tour-padding-primary: 16px;
  --el-tour-font-line-height: 1.5;
  --el-tour-title-font-size: 16px;
  --el-tour-title-color: #{$app-primary-color};
  --el-tour-title-font-weight: 500;
  --el-tour-font-size: 14px;
  --el-tour-color: #{$grey};
  --el-tour-bg-color: white;
  --el-tour-border-radius: 4px;
  font-family: $font-family;

  .el-tour__content {
    border: 1px solid $app-primary-color;
  }

  .el-tour__arrow {
    border-color: $app-primary-color;
  }

  .el-tour__closebtn {
    width: 44px;
    height: 44px;
  }

  .el-tour__close {
    color: $lightGrey;

    &:hover {
      color: $app-primary-color;
    }
  }

  .el-tour-buttons {
    .el-button {
      font-family: inherit;

      &.el-button--primary {
        background-color: $app-primary-color;
        border-color: $app-primary-color;

        &:hover {
          background-color: #ac76c5;
          border-color: #ac76c5;
        }
      }

      // "Previous", el-tour gives it no type, it follows the plain buttons of the maps viewer
      &:not(.el-button--primary) {
        &:hover,
        &:focus,
        &:active {
          color: $app-primary-color;
          background-color: #f3e6f9;
          border-color: #cd99e5;
        }
      }
    }
  }
}

.help-mode-tour__header {
  display: flex;
  flex-direction: column;
  padding-right: 24px;
}

// A long label, e.g. a panel with a long map name, wraps to two lines at most,
// the full label is in its tooltip
.help-mode-tour__group {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: 0.04em;
  color: $lightGrey;
}

.help-mode-tour__title {
  font-size: 16px;
  font-weight: 500;
  color: $app-primary-color;
}

// The divider is on the title, padding under the clamped label would show part of a third line
.help-mode-tour__group + .help-mode-tour__title {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid $lineColor2;
}

// HTML of the description, e.g. paragraphs and lists, also used by `HelpModeHover`
.help-mode-tour__description {
  p {
    margin: 0 0 8px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  ul,
  ol {
    margin: 4px 0;
    padding-left: 20px;
  }

  li + li {
    margin-top: 6px;
  }

  code {
    font-size: 0.9em;
    padding: 0 4px;
    border-radius: 2px;
    background-color: #f3e6f9;
  }
}

.help-mode-tour__counter {
  font-size: 12px;
  color: $lightGrey;
}
</style>

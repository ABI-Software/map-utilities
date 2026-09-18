<template>
  <div class="help-mode-dialog" :class="{ finish: lastItem }">
    <h4>Help Mode</h4>

    <template v-if="lastItem">
      <p>
        All caught up!
        <br />
        Click 'Help' to restart.
      </p>
      <div>
        <el-button class="button" @click="finishHelpMode">Finish</el-button>
      </div>
    </template>
    <template v-else>
      <p>Click "Next" to see the next item.</p>
      <div>
        <el-button class="button" @click="showNext">Next</el-button>
        <el-button class="button secondary" @click="finishHelpMode">Exit Help Mode</el-button>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  name: 'HelpModeDialog',
  props: {
    /**
     * MultiFlatmapRef from multiflatmapvuer. Provide this when using with MultiFlatmap.
     */
    multiflatmapRef: {
      type: Object,
      default: null,
    },
    /**
     * FlatmapRef from flatmapvuer. Provide this when using with Flatmap.
     */
    flatmapRef: {
      type: Object,
      default: null,
    },
    /**
     * ScaffoldRef from scaffoldvuer. Provide this when using with Scaffold.
     */
    scaffoldRef: {
      type: Object,
      default: null,
    },
    /**
     * The flag for last tooltip item.
     */
    lastItem: {
      type: Boolean,
      default: false,
      required: false,
    },
  },
  mounted: function () {
    this.toggleHelpModeHighlight(true);
    // For tooltips outside of Flatmap
    this.toggleTooltipHighlight();
  },
  unmounted: function () {
    this.toggleHelpModeHighlight(false);
  },
  watch: {
    lastItem: function (isLastItem) {
      if (isLastItem) {
        this.toggleTooltipHighlight();
      }
    },
  },
  methods: {
    /**
     * This function will be called on clicking Next button.
     *
     * @public
     */
    showNext: function () {
      /**
       * This event is emitted after clicking Next button.
       */
      this.$emit('show-next');
    },
    /**
     * This function will be called on clicking Finish button.
     *
     * @public
     */
    finishHelpMode: function () {
      /**
       * This event is emitted after clicking Finish button.
       */
      this.$emit('finish-help-mode');
    },
    /**
     * This function must be called on 'shown-map-tooltip' event.
     *
     * @public
     */
    toggleTooltipPinHighlight: function () {
      const currentFlatmapEl = this.getCurrentFlatmap();
      this.resetHighlightedItems();

      this.$nextTick(() => {
        // Temporary solution to find the position of map marker from popover
        const mapPins = currentFlatmapEl.querySelectorAll('.maplibregl-marker');
        const mapPinPopover = currentFlatmapEl.querySelector('.flatmap-popup-popper');
        const styleVal = mapPinPopover?.style?.transform || '';
        const mapPopoverPosition = this.extractMarkerPosition(styleVal);

        mapPins.forEach((mapPin) => {
          const mapPinStyleVal = mapPin.style.transform;
          const mapPinPosition = this.extractMarkerPosition(mapPinStyleVal);

          if (mapPinPosition === mapPopoverPosition) {
            mapPin.classList.add('in-help-highlight');
          }
        });
      });
    },
    /**
     * This function must be called on 'shown-tooltip' event.
     *
     * @public
     */
    toggleTooltipHighlight: function () {
      this.resetHighlightedItems();

      this.$nextTick(() => {
        const activePoppers = document.querySelectorAll('.el-popper:not([style*="none"])');

        activePoppers.forEach((activePopper) => {
          const multiFlatmapTooltip = activePopper.classList.contains('flatmap-popper');
          const flatmapTooltip = activePopper.classList.contains('el-fade-in-linear-enter-active');

          if (multiFlatmapTooltip || flatmapTooltip) {
            this.toggleHighlight(activePopper);
          }
        });
      });
    },
    toggleHighlight: function (activePopper) {
      const popperId = activePopper?.id || '';
      const popperTrigger = document.querySelector(`[aria-describedby="${popperId}"]`);

      if (popperTrigger) {
        popperTrigger.classList.add('in-help-highlight');
      }
    },
    resetHighlightedItems: function () {
      const allHighlightedItems = document.querySelectorAll('.in-help-highlight');
      allHighlightedItems.forEach((el) => {
        el.classList.remove('in-help-highlight');
      });
    },
    getCurrentScaffold: function () {
      const scaffoldEl = this.scaffoldRef?.$el || null;
      return scaffoldEl;
    },
    getCurrentMultiflatmap: function () {
      const multiflatmapEl = this.multiflatmapRef?.$el || null;
      return multiflatmapEl;
    },
    getCurrentFlatmap: function () {
      const flatmap = this.flatmapRef || this.multiflatmapRef?.getCurrentFlatmap();
      const flatmapEl = flatmap?.$el || null;
      return flatmapEl;
    },
    toggleHelpModeHighlight: function (option) {
      const currentMultiflatmapEl = this.getCurrentMultiflatmap();
      const currentFlatmapEl = this.getCurrentFlatmap();
      const currentScaffoldEl = this.getCurrentScaffold();
      const allHighlightedItems = document.querySelectorAll('.in-help-highlight');

      if (currentMultiflatmapEl) {
        if (option) {
          currentMultiflatmapEl.classList.add('in-help');
        } else {
          currentMultiflatmapEl.classList.remove('in-help');
        }
      }

      if (currentFlatmapEl) {
        if (option) {
          currentFlatmapEl.classList.add('in-help');
        } else {
          currentFlatmapEl.classList.remove('in-help');
        }
      }

      if (currentScaffoldEl) {
        if (option) {
          currentScaffoldEl.classList.add('in-help');
        } else {
          currentScaffoldEl.classList.remove('in-help');
        }
      }

      if (!option) {
        allHighlightedItems.forEach((el) => {
          el.classList.remove('in-help-highlight');
        });
      }
    },
    /**
     * Temporary solution to find the position of map marker from popover
     */
    extractMarkerPosition: function (str) {
      const translateRegex = /translate\((.*?)\)/g;
      const matches = str.match(translateRegex);
      if (!matches) {
        return '';
      }
      const lastMatch = matches[matches.length - 1];
      const values = lastMatch.slice(10, -1);
      return values;
    },
  },
};
</script>

<style lang="scss" scoped>
.help-mode-dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 300px;
  padding: 1rem;
  font-family: $font-family;
  font-size: 14px;
  background: white;
  border-radius: 4px 4px;
  border: 1px solid $app-primary-color;
  box-shadow: 0px 0px 160px 80px rgba(0, 0, 0, 0.5);
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;

  &.finish {
    animation: shake 0.35s;
    animation-delay: 0.7s;
  }

  h4 {
    color: $app-primary-color;
  }

  h4,
  p {
    margin: 0;
  }

  p {
    line-height: 1.5;
  }

  .button {
    color: #fff;
    background-color: $app-primary-color;
    transform: scale(1);
    transform-origin: 50% 50%;
    transition: all var(--el-transition-duration);

    &:hover {
      color: #fff !important;
      background: #ac76c5 !important;
      border: 1px solid #ac76c5 !important;
    }

    &:active {
      transform: scale(0.95);
    }

    &.secondary {
      background: #f3e6f9;
      border-color: $app-primary-color;
      color: $app-primary-color;

      &:hover {
        color: $app-primary-color !important;
        background: #fff !important;
      }
    }
  }
}

@keyframes shake {
  0% {
    transform: translateX(-50%) rotate(2deg);
  }
  25% {
    transform: translateX(-50%) rotate(-2deg);
  }
  50% {
    transform: translateX(-50%) rotate(2deg);
  }
  75% {
    transform: translateX(-50%) rotate(-2deg);
  }
  100% {
    transform: translateX(-50%) rotate(2deg);
  }
}

// Just for App.vue with options popover on top
.help-mode-dialog {
  .options-popover + .multi-container + & {
    margin-top: 40px;
  }
  .options-popover:not([style*='display: none']) + .multi-container + & {
    margin-top: 175px;
  }
}
</style>

<style lang="scss">
.scaffold-container.in-help,
.flatmap-container.in-help {
  background: rgba(0, 0, 0, 0.3);
}

.scaffold-container.in-help {
  canvas {
    opacity: 0.3;
  }
}

.scaffold-container.in-help,
.flatmap-container.in-help {
  .el-tooltip__trigger,
  .el-popover {
    opacity: 0.3;
  }

  .pathway-location:has(.in-help-highlight) {
    opacity: 1;

    .pathway-container {
      background: transparent;
    }

    .container,
    .legends-container,
    .selections-container {
      opacity: 0.3;
    }
  }

  .maplibregl-canvas,
  .maplibregl-ctrl-minimap {
    opacity: 0.3;
  }

  .maplibregl-map,
  .maplibregl-canvas {
    pointer-events: none;
  }
}

.in-help .el-popper:not([style*='none']) {
  opacity: 1 !important;
}

.in-help-highlight {
  opacity: 1 !important;
  background: white !important;
  box-shadow: 0px 0px 128px 128px white !important;
  animation: highlight-area 0.1s;

  &.maplibregl-marker {
    background: none !important;
    box-shadow: 0px 0px 128px 128px rgba(255, 255, 255, 0.5) !important;
  }
}
</style>

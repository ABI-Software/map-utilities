<template>
  <div class="tooltip-container" id="tooltip-container">
    <template v-if="annotationDisplay">
      <annotation-popup
        :annotationEntry="annotationEntry"
        @annotation="$emit('annotation', $event)"
      />
    </template>
    <template v-else>
      <provenance-popup :tooltipEntry="tooltipEntry" />
    </template>
  </div>
</template>

<script>
import EventBus from '../EventBus.js';

export default {
  name: "Tooltip",
  props: {
    tooltipEntry: {
      type: Array,
    },
    annotationDisplay: {
      type: Boolean,
      default: false,
    },
    annotationEntry: {
      type: Array,
    },
  },
  mounted: function() {
    // Emit events from child components
    EventBus.on("onActionClick", (data) => {
      this.$emit("onActionClick", data);
    });
  },
};
</script>

<style lang="scss" scoped>
.tooltip-container {
  text-align: justify;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  background: #fff;
  border: 1px solid $app-primary-color;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

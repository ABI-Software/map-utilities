<template>
  <el-tooltip
    :content="textLabel"
    placement="bottom"
    effect="clipboard-tooltip"
    :teleported="true"
    :append-to="tooltipContainer"
  >
    <el-button
      class="reference-icon-button"
      :class="theme"
      size="small"
      @click="$emit('show-related-connectivities', resource)"
    >
      <el-icon :color="iconColor">
        <el-icon-connection />
      </el-icon>
      <span class="visually-hidden">{{ textLabel }}</span>
    </el-button>
  </el-tooltip>
</template>

<script>
const LABEL = 'Show related connectivities';
const APP_PRIMARY_COLOR = '#8300bf';

export default {
  name: "RelatedConnectivitiesButton",
  props: {
    resource: {
      type: String,
      required: true,
    },
    /**
     * `theme: light` will show white button,
     * to use when the button is over other readable text content.
     * Default button is transparent.
     */
    theme: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      textLabel: LABEL,
      iconColor: APP_PRIMARY_COLOR,
      tooltipContainer: null,
    };
  },
  mounted() {
    const fullscreenContainer = document.querySelector('.mapcontent');

    if (fullscreenContainer) {
      this.tooltipContainer = fullscreenContainer;
    } else {
      this.tooltipContainer = document.body;
    }
  },
};
</script>

<style lang="scss" scoped>
  .reference-icon-button {
    margin-left: 0px !important;
    margin-top: 0px !important;
    padding: 0.25rem !important;
    font-size: 14px !important;
    transition: all 0.25s ease;

    &,
    &:focus,
    &:active {
      color: $app-primary-color !important;
      background: transparent !important;
      border-color: transparent !important;
      box-shadow: none !important;
    }

    &.light {
      &,
      &:focus,
      &:active {
        background: #fff !important;
        border-color: #fff !important;
      }
    }

    &:hover {
      background: #f3e6f9 !important;
      border-color: #f3e6f9 !important;
    }
  }

  .visually-hidden {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
</style>

<style lang="scss">
  .el-popper.is-clipboard-tooltip {
    padding: 4px 10px;
    font-family: Asap;
    background: #f3ecf6 !important;
    border: 1px solid $app-primary-color;

    & .el-popper__arrow::before {
      border: 1px solid;
      border-color: $app-primary-color;
      background: #f3ecf6;
    }
  }
</style>

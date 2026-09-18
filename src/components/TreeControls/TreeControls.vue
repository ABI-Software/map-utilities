<template>
  <div class="selections-container">
    <el-row v-if="title">
      <el-col :span="12">
        <div class="title-text">
          {{ title }}
        </div>
      </el-col>
      <el-col v-if="enableFilter" :span="12">
        <div>
          <el-input
            class="tree-filter-input"
            v-model="filterText"
            :placeholder="'Filter ' + title"
          />
        </div>
      </el-col>
    </el-row>
    <div class="tree-container" ref="treeContainer">
      <div :class="['tree-tooltip', tooltipAtBottom ? 'bottom' : '']">
        <el-popover
          ref="tooltip"
          :visible="tooltipVisible && tooltipLabel !== ''"
          placement="top"
          :show-arrow="false"
          :teleported="false"
          trigger="manual"
          popper-class="tree-tooltip-popper"
          virtual-triggering
          :width="260"
        >
          <template #default>
            <div class="tooltip-text">{{ tooltipLabel }}</div>
          </template>
        </el-popover>
      </div>
      <el-tree
        ref="regionTree"
        v-loading="!isReady"
        element-loading-background="rgba(0, 0, 0, 0.3)"
        show-checkbox
        :node-key="nodeKey"
        :data="treeData"
        :check-on-click-node="checkOnClickNode"
        :check-on-click-leaf="checkOnClickNode"
        :check-strictly="false"
        :expand-on-click-node="false"
        :render-after-expand="false"
        :default-expanded-keys="expandedKeys"
        @check="checkChanged"
        :indent="8"
        :filter-node-method="filterNode"
        :class="[mapType === 'flatmap' ? 'hide_grandchildren_checkbox' : '']"
      >
        <template #default="{ node, data }">
          <span
            v-if="mapType === 'flatmap'"
            class="region-tree-node"
            :class="{
              activeItem: nodeIsActive(data),
              hoverItem: nodeIsHover(data),
            }"
            @click="changeActiveByNode(data)"
            @mouseover="changeHoverByNode(data, false)"
            @mouseenter="displayTooltip(node.label, true, $event)"
            @mouseleave="displayTooltip('', false, $event)"
          >
            <div :style="getBackgroundStyles(data)" class="lastChildInItem">
              {{ node.label }}
            </div>
          </span>
          <span
            v-else-if="mapType === 'scaffold'"
            class="region-tree-node"
            :class="{
              activeItem: active.includes(data.id),
              hoverItem: hover.includes(data.id),
            }"
            @click="changeActiveByNode(data, true)"
            @mouseover="changeHoverByNode(data, true, $event)"
            @mouseenter="displayTooltip(node.label, true, $event)"
            @mouseleave="displayTooltip('', false, $event)"
          >
            <el-color-picker
              v-if="data.isPrimitives"
              :class="{ 'show-picker': showColourPicker }"
              v-model="data.activeColour"
              size="small"
              @change="setColour(data, $event)"
            />
            <div class="lastChildInItem">
              <span>{{ node.label }}</span>
              <span v-if="data.isTextureSlides" class="node-options">(Texture)</span>
            </div>
          </span>
        </template>
      </el-tree>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TreeControls',
  props: {
    checkOnClickNode: {
      type: Boolean,
      default: false,
    },
    /**
     * The type of map that the TreeControls is used. Either "flatmap" or "scaffold".
     */
    mapType: {
      type: String,
      required: true,
    },
    isReady: {
      type: Boolean,
      default: true,
    },
    /**
     * The title of the TreeControls.
     */
    title: {
      type: String,
    },
    /**
     * The data of the tree.
     */
    treeData: {
      type: Array,
      default: function () {
        return [];
      },
    },
    showColourPicker: {
      type: Boolean,
      default: false,
    },
    /**
     * The active node of the tree.
     */
    active: {
      type: [String, Array],
      required: true,
    },
    /**
     * The hover node of the tree.
     */
    hover: {
      type: [String, Array],
      required: true,
    },
    enableFilter: {
      type: Boolean,
      default: true,
    },
  },
  data: function () {
    return {
      defaultExpandedKeys: ['All'],
      filterText: '',
      tooltipVisible: false,
      tooltipLabel: '',
      tooltipAtBottom: false,
    };
  },
  computed: {
    isFlatmap: function () {
      return this.mapType === 'flatmap';
    },
    isScaffold: function () {
      return this.mapType === 'scaffold';
    },
    nodeKey: function () {
      if (this.isFlatmap) {
        return 'key';
      } else if (this.isScaffold) {
        return 'id';
      }
      return undefined;
    },
    expandedKeys: function () {
      if (this.isFlatmap) {
        return this.defaultExpandedKeys;
      } else if (this.isScaffold) {
        return [];
      }
      return [];
    },
  },
  watch: {
    filterText: {
      handler: function (value) {
        if (this.$refs.regionTree) this.$refs.regionTree.filter(value);
      },
    },
  },
  methods: {
    filterNode: function (value, data) {
      if (!value) return true;
      return data.label ? data.label.toLowerCase().includes(value.toLowerCase()) : false;
    },
    setColour: function (nodeData, value) {
      this.$emit('setColour', nodeData, value);
    },
    getBackgroundStyles: function (node) {
      if ('colour' in node) {
        return { background: node.colour };
      }
      return {};
    },
    nodeIsActive: function (data) {
      return this.active === data.models;
    },
    nodeIsHover: function (data) {
      return this.hover === data.models;
    },
    changeActiveByNode: function (data, propagate = false) {
      if (this.isFlatmap) {
        if (data.models) {
          this.$emit('changeActive', data.models);
        }
      } else if (this.isScaffold) {
        if (data.isPrimitives || data.isRegion) {
          this.$emit('changeActive', data, propagate);
        }
      }
    },
    changeHoverByNode: function (data, propagate = false) {
      if (this.isFlatmap) {
        if (data.models) {
          this.$emit('changeHover', data.models);
        }
      } else if (this.isScaffold) {
        if (data.isPrimitives) {
          this.$emit('changeHover', data, propagate);
        }
      }
    },
    checkChanged: function (node, data) {
      if (this.isFlatmap) {
        const isChecked = data.checkedKeys.includes(node.key);
        if (node.key === 'All') {
          this.$emit('checkAll', isChecked);
        } else {
          this.$emit('checkChanged', { key: node.key, value: isChecked });
        }
      } else if (this.isScaffold) {
        this.$emit('checkChanged', node, data);
      }
    },
    displayTooltip: function (tooltipLabel, visible, e) {
      const hoverItem = e.target;
      const containerItem = hoverItem.closest('.el-tree-node__content');
      const containerItemWidth = containerItem.clientWidth;
      const xOffset = containerItem.getBoundingClientRect().x;
      const lastElement = containerItem.querySelector('.lastChildInItem');
      let childrenWidth = 0;
      if (lastElement) {
        const rect = lastElement.getBoundingClientRect();
        childrenWidth = rect.x + rect.width - xOffset;
      }
      const longLabel = childrenWidth > containerItemWidth;
      this.tooltipVisible = longLabel && visible;
      this.tooltipLabel = tooltipLabel;
      this.tooltipAtBottom = 0.5 > e.layerY / this.$refs.treeContainer.clientHeight ? true : false;
    },
  },
  unmounted: function () {
    this.sortedPrimitiveGroups = undefined;
  },
  mounted: function () {
    if (this.$refs.regionTree) this.$refs.regionTree.filter(this.filterText);
  },
};
</script>

<style lang="scss" scoped>
:deep(.el-loading-spinner) {
  .path {
    stroke: $app-primary-color;
  }

  .el-loading-text {
    color: $app-primary-color;
  }
}

.selections-container {
  width: 260px;
  padding-top: 5px;
  font-family: $font-family;
}

.title-text {
  width: 59px;
  height: 20px;
  color: rgb(48, 49, 51);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
  margin-left: 8px;
}

:deep(.tree-filter-input) {
  .el-input__inner {
    height: 20px;
  }
  .el-input__wrapper.is-focus {
    box-shadow: 0 0 0 1px $app-primary-color;
  }
}

.tree-container {
  width: 260px;
  border: 1px solid rgb(144, 147, 153);
  border-radius: 4px;
  background: #ffffff;
  margin-top: 6px;
  scrollbar-width: thin;
  overflow: hidden;
  position: relative;

  :deep(.el-tree) {
    max-height: 240px;
    min-height: 130px;
    overflow: auto;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 10px;
      box-shadow: inset 0 0 6px #c0c4cc;
    }
  }

  :deep(.el-tree-node__content) {
    height: 22px;
  }
}

:deep(.el-checkbox__input) {
  &.is-indeterminate,
  &.is-checked {
    .el-checkbox__inner {
      background-color: $app-primary-color;
      border-color: $app-primary-color;
    }
  }
}

.hide_grandchildren_checkbox {
  :deep(
    .el-tree-node__children .el-tree-node__children .el-tree-node__content > label.el-checkbox
  ) {
    display: none;
  }
}

:deep(.el-checkbox__label) {
  padding-left: 5px;
  color: inherit !important;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0px;
  line-height: 14px;
}

.activeItem {
  background-color: #bbb !important;
}

.hoverItem {
  background-color: #eee !important;
}

.region-tree-node {
  flex: 1;
  color: inherit !important;
  display: flex;
  font-size: 12px;
  line-height: 14px;
  padding-left: 0px;
  background-color: #fff;
  width: 100%;

  :deep(.el-color-picker) {
    pointer-events: none;
    height: 14px !important;
  }

  :deep(.el-color-picker__trigger) {
    margin-left: 8px;
    margin-right: 8px;
    padding: 0px;
    height: 14px;
    width: 14px;
    border: 0px;
  }
}

:deep(.el-color-picker__color) {
  border: 1px solid $app-primary-color;
}

:deep(.el-color-picker__icon) {
  &.is-icon-arrow-down {
    display: none;
  }
}

:deep(.show-picker) {
  &.el-color-picker {
    pointer-events: auto;
  }
  .el-color-picker__icon {
    &.is-icon-arrow-down {
      display: block;
    }
  }
}

.hide-scaffold-colour-popup {
  display: none;
}

.node-options {
  text-align: right;
}

:deep(.tree-tooltip-popper.el-popover) {
  text-transform: none !important; // need to overide the tooltip text transform
  border: 1px solid $app-primary-color;
  padding: 4px;
  font-size: 12px;
  .el-popper__arrow {
    &:before {
      border-color: $app-primary-color;
      background-color: #ffffff;
    }
  }
}

.tree-tooltip {
  position: absolute;
  &.bottom {
    top: 70%;
  }
}
</style>

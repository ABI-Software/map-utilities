<template>
  <div class="toolbar-container">
    <map-svg-sprite-color />
    <div class="toolbar-icons">
      <el-popover
        v-if="showEditModeIcon"
        content="Edit Mode"
        placement="top"
        :teleported="false"
        trigger="manual"
        width="100"
        popper-class="flatmap-popper"
        :visible="hoverVisibilities[hoverIndex('editPopover')].value"
        ref="editPopover"
      >
        <template #reference>
          <map-svg-icon
            icon="comment"
            class="icon-button drawEdit"
            @click="modeClickEvent('Edit')"
            @mouseover="showTooltip(hoverIndex('editPopover'))"
            @mouseout="hideTooltip(hoverIndex('editPopover'))"
          />
        </template>
      </el-popover>
      <el-popover
        v-if="showDeleteModeIcon"
        content="Delete Mode"
        placement="top"
        :teleported="false"
        trigger="manual"
        width="100"
        popper-class="flatmap-popper"
        :visible="hoverVisibilities[hoverIndex('deletePopover')].value"
        ref="deletePopover"
      >
        <template #reference>
          <map-svg-icon
            icon="drawTrash"
            class="icon-button drawDelete"
            @click="modeClickEvent('Delete')"
            @mouseover="showTooltip(hoverIndex('deletePopover'))"
            @mouseout="hideTooltip(hoverIndex('deletePopover'))"
          />
        </template>
      </el-popover>
      <el-popover
        v-if="showDrawPointIcon"
        content="Draw Point"
        placement="top"
        :teleported="false"
        trigger="manual"
        width="100"
        popper-class="flatmap-popper"
        :visible="hoverVisibilities[hoverIndex('pointPopover')].value"
        ref="pointPopover"
      >
        <template #reference>
          <map-svg-icon
            icon="drawPoint"
            class="icon-button drawPoint"
            @click="toolClickEvent('Point')"
            @mouseover="showTooltip(hoverIndex('pointPopover'))"
            @mouseout="hideTooltip(hoverIndex('pointPopover'))"
          />
        </template>
      </el-popover>
      <el-popover
        v-if="showDrawLineStringIcon"
        content="Draw LineString"
        placement="top"
        :teleported="false"
        trigger="manual"
        width="100"
        popper-class="flatmap-popper"
        :visible="hoverVisibilities[hoverIndex('lineStringPopover')].value"
        ref="drawLinePopover"
      >
        <template #reference>
          <map-svg-icon
            icon="drawLine"
            class="icon-button drawLineString"
            @click="toolClickEvent('LineString')"
            @mouseover="showTooltip(hoverIndex('lineStringPopover'))"
            @mouseout="hideTooltip(hoverIndex('lineStringPopover'))"
          />
        </template>
      </el-popover>
      <el-popover
        v-if="showDrawPolygonIcon"
        content="Draw Polygon"
        placement="top"
        :teleported="false"
        trigger="manual"
        width="100"
        popper-class="flatmap-popper"
        :visible="hoverVisibilities[hoverIndex('polygonPopover')].value"
        ref="polygonPopover"
      >
        <template #reference>
          <map-svg-icon
            icon="drawPolygon"
            class="icon-button drawPolygon"
            @click="toolClickEvent('Polygon')"
            @mouseover="showTooltip(hoverIndex('polygonPopover'))"
            @mouseout="hideTooltip(hoverIndex('polygonPopover'))"
          />
        </template>
      </el-popover>
      <el-popover
        v-if="showConnectionIcon"
        content="Connectivity"
        placement="top"
        :teleported="false"
        trigger="manual"
        width="100"
        popper-class="flatmap-popper"
        :visible="hoverVisibilities[hoverIndex('connectionPopover')].value"
        ref="connectionPopover"
      >
        <template #reference>
          <map-svg-icon
            icon="connection"
            class="icon-button drawConnection"
            @click="connectionClickEvent()"
            @mouseover="showTooltip(hoverIndex('connectionPopover'))"
            @mouseout="hideTooltip(hoverIndex('connectionPopover'))"
          />
        </template>
      </el-popover>
    </div>
    <ConnectionDialog
      v-if="mapCanvas"
      class="connection-dialog"
      v-show="connectionDisplay"
      :connectionEntry="connectionEntry"
      :inDrawing="inDrawing"
      :connectionExist="connectionExist"
      @dialogDisplay="connectionClickEvent()"
      @confirmDrawn="$emit('confirmDrawn', $event)"
      @cancelDrawn="$emit('cancelDrawn', $event)"
      @featureTooltip="$emit('featureTooltip', $event)"
    />
  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */
import { MapSvgIcon, MapSvgSpriteColor } from "@abi-software/svg-sprite";
import "@abi-software/svg-sprite/dist/style.css";

/**
 * @param scopeElement    Draggable scope area (Optional)
 * @param dragElement     Draggable element
 */
const draggable = (scopeElement, dragElement) => {
  let startX, startY, clickX, clickY, posX, posY;
  // reset position in case previous popped up dialog is dragged
  dragElement.style.left = "";
  dragElement.style.top = "";
  // const scopeRect = scopeElement.getBoundingClientRect()
  // const dragRect = dragElement.getBoundingClientRect()

  dragElement.addEventListener(
    "mousedown",
    (e) => {
      e.preventDefault();
      startX = dragElement.offsetLeft;
      startY = dragElement.offsetTop;
      clickX = e.clientX;
      clickY = e.clientY;

      dragElement.addEventListener("mousemove", drag, false);
      document.addEventListener(
        "mouseup",
        () => {
          dragElement.removeEventListener("mousemove", drag, false);
        },
        false
      );
    },
    false
  );

  function drag(e) {
    e.preventDefault();
    posX = startX - (clickX - e.clientX);
    posY = startY - (clickY - e.clientY);
    // if (
    //   (posX > scopeRect.left && ((posX + dragRect.width) < scopeRect.right)) &&
    //   (posY > scopeRect.top && ((posY + dragRect.height) < scopeRect.bottom))
    // ) {
    dragElement.style.left = `${posX}px`;
    dragElement.style.top = `${posY}px`;
    // } else {
    //   if (posX <= scopeRect.left) {
    //     dragElement.style.left = '0px';
    //   } else if (posX + dragRect.width >= scopeRect.right) {
    //     dragElement.style.left = `${scopeRect.right - dragRect.width}px`;
    //   }
    //   if (posY <= scopeRect.top) {
    //     dragElement.style.top = '0px';
    //   } else if (posY + dragRect.height >= scopeRect.bottom) {
    //     dragElement.style.top = `${scopeRect.bottom - dragRect.height}px`;
    //   }
    // }
  }
};

export default {
  name: "DrawToolbar",
  components: {
    MapSvgIcon,
    MapSvgSpriteColor,
  },
  props: {
    /**
     * Optional
     *
     * Associated with the Connection dialog.
     * This is needed to display the dialog and provides the additional drag capability to the dialog.
     *
     * e.g.
     * :mapCanvas="{
     *   containerHTML: appRef, // Reference to the map canvas container.
     *   class: '.maplibregl-canvas', // CSS selector for the map canvas.
     * }"
     */
    mapCanvas: {
      type: Object,
      default: undefined,
    },
    /**
     * Array of toolbar options to display.
     * 'Connection' requires 'LineString' is included in the toolbar options.
     */
    toolbarOptions: {
      type: Array,
      default: [
        "Edit",
        "Delete",
        "Point",
        "LineString",
        "Polygon",
        "Connection",
      ],
    },
    /**
     * Optional
     *
     * To update the toolbar icons or filter the features based on the tool type.
     * e.g. "All tools", "Point", "LineString", "Polygon" or "None".
     */
    drawnType: {
      type: String,
      default: "All tools",
    },
    activeDrawTool: {
      required: true,
    },
    activeDrawMode: {
      required: true,
    },
    /**
     * Optional
     *
     * Associated with the Connection dialog.
     * This will popup a dialog if new feature is drawn and map canvas exists.
     */
    newlyDrawnEntry: {
      type: Object,
      default: {},
    },
    /**
     * Optional
     *
     * Associated with the Connection dialog.
     * This will add entries to the dialog.
     */
    connectionEntry: {
      type: Object,
      default: {},
    },
    /**
     * Add following to the top hoverVisibilities array to enable tooltips for each icon.
     * [
     *  { value: false, refs: 'toolbarPopover', ref: 'editPopover' },
     *  { value: false, refs: 'toolbarPopover', ref: 'deletePopover' },
     *  { value: false, refs: 'toolbarPopover', ref: 'pointPopover' },
     *  { value: false, refs: 'toolbarPopover', ref: 'lineStringPopover' },
     *  { value: false, refs: 'toolbarPopover', ref: 'polygonPopover' },
     *  { value: false, refs: 'toolbarPopover', ref: 'connectionPopover' },
     * ]
     */
    hoverVisibilities: {
      type: Array,
      required: true,
      default: [
        { value: false, ref: "editPopover" },
        { value: false, ref: "deletePopover" },
        { value: false, ref: "pointPopover" },
        { value: false, ref: "lineStringPopover" },
        { value: false, ref: "polygonPopover" },
        { value: false, ref: "connectionPopover" },
      ],
    },
  },
  data: function () {
    return {
      toolbarIcons: [
        { name: "Edit", active: false, disabled: false, type: "mode" },
        { name: "Delete", active: false, disabled: false, type: "mode" },
        { name: "Point", active: false, disabled: false, type: "tool" },
        { name: "LineString", active: false, disabled: false, type: "tool" },
        { name: "Polygon", active: false, disabled: false, type: "tool" },
        { name: "Connection", active: false, disabled: true, type: "conn" },
      ],
      connectionDisplay: false,
      dialogPosition: {
        offsetX: 0,
        offsetY: 0,
        x: undefined,
        y: undefined,
      },
    };
  },
  computed: {
    showAllToolIcons: function () {
      return this.drawnType === "All tools" || this.drawnType === "None";
    },
    showEditModeIcon: function () {
      return this.toolbarOptions.includes("Edit");
    },
    showDeleteModeIcon: function () {
      return this.toolbarOptions.includes("Delete");
    },
    showDrawPointIcon: function () {
      return (
        this.toolbarOptions.includes("Point") &&
        (this.showAllToolIcons || this.drawnType === "Point")
      );
    },
    showDrawLineStringIcon: function () {
      return (
        this.toolbarOptions.includes("LineString") &&
        (this.showAllToolIcons || this.drawnType === "LineString")
      );
    },
    showDrawPolygonIcon: function () {
      return (
        this.toolbarOptions.includes("Polygon") &&
        (this.showAllToolIcons || this.drawnType === "Polygon")
      );
    },
    showConnectionIcon: function () {
      return (
        this.toolbarOptions.includes("Connection") &&
        this.toolbarOptions.includes("LineString") &&
        (this.showAllToolIcons || this.drawnType === "LineString")
      );
    },
    inDrawing: function () {
      return this.activeDrawTool !== undefined;
    },
    newlyDrawnExist: function () {
      return Object.keys(this.newlyDrawnEntry).length > 0;
    },
    connectionExist: function () {
      return Object.keys(this.connectionEntry).length > 0;
    },
  },
  watch: {
    drawnType: function () {
      this.disabledToolbarConnectionIcon(true);
    },
    activeDrawMode: function (value) {
      this.updateToolbarIcons(value, "mode");
      if (value === "Delete") {
        this.connectionDisplay = false;
      }
    },
    activeDrawTool: function (value) {
      this.updateToolbarIcons(value, "tool");
      if (!value) {
        this.connectionDisplay = false;
      }
    },
    newlyDrawnExist: function (value) {
      if (value) {
        this.connectionDisplay = true;
      }
    },
    connectionExist: function (value) {
      this.disabledToolbarConnectionIcon(!value);
      if (!value) {
        this.connectionDisplay = false;
      }
    },
    connectionDisplay: function (value) {
      this.activeToolbarConnectionIcon(value);
      if (value) {
        this.dialogCssHacks();
      } else {
        this.$emit("featureTooltip", undefined);
      }
    },
    dialogPosition: {
      handler: function () {
        const containerRect = this.$el.getBoundingClientRect();
        this.dialogPosition.offsetX = containerRect.x;
        this.dialogPosition.offsetY = containerRect.y;
      },
      deep: true,
      once: true,
    },
  },
  methods: {
    iconDisabled: function (name) {
      return this.toolbarIcons.filter((icon) => icon.name === name)[0].disabled;
    },
    modeClickEvent: function (type) {
      if (!this.iconDisabled(type)) {
        const drawMode = this.activeDrawMode === type ? undefined : type;
        this.$emit("clickToolbar", "mode", drawMode);
      }
    },
    toolClickEvent: function (type) {
      if (!this.iconDisabled(type)) {
        const drawTool = this.activeDrawTool === type ? undefined : type;
        this.$emit("clickToolbar", "tool", drawTool);
      }
    },
    connectionClickEvent: function () {
      if (!this.iconDisabled("Connection") && !this.newlyDrawnExist) {
        this.connectionDisplay = !this.connectionDisplay;
      }
    },
    updateToolbarIcons: function (value, type) {
      this.toolbarIcons.map((icon) => {
        if (icon.name === value) {
          icon.active = true;
        } else {
          icon.active = false;
        }
      });
      this.toolbarIcons
        .filter((icon) => icon.type !== "conn")
        .filter((icon) => icon.type !== type)
        .map((icon) => {
          if (value) {
            icon.disabled = true;
          } else {
            icon.disabled = false;
          }
        });
      this.toolbarCssHacks();
    },
    disabledToolbarConnectionIcon: function (value) {
      this.toolbarIcons
        .filter((icon) => icon.type === "conn")
        .map((icon) => {
          if (value) {
            icon.disabled = true;
          } else {
            icon.disabled = false;
          }
          // Disable connection icon when delete mode is on
          if (this.activeDrawMode === "Delete") {
            icon.disabled = true;
          }
        });
      this.toolbarCssHacks();
    },
    activeToolbarConnectionIcon: function (value) {
      this.toolbarIcons
        .filter((icon) => icon.type === "conn")
        .map((icon) => {
          if (value) {
            icon.active = true;
          } else {
            icon.active = false;
          }
        });
      this.toolbarCssHacks();
    },
    toolbarCssHacks: function () {
      this.$nextTick(() => {
        this.toolbarIcons.map((icon) => {
          const iconElement = this.$el.querySelector(`.draw${icon.name}`);
          if (iconElement) {
            if (icon.active) {
              iconElement.classList.add("active");
            } else {
              iconElement.classList.remove("active");
            }
            if (icon.disabled) {
              iconElement.classList.add("disabled");
            } else {
              iconElement.classList.remove("disabled");
            }
          }
        });
      });
    },
    dialogCssHacks: function () {
      this.$nextTick(() => {
        const dialog = this.$el.querySelector(".connection-dialog");
        draggable(this.mapCanvas.containerHTML, dialog);
        // dialog popup at the click position
        // slightly change x or y if close to boundary
        let posX, posY;
        const containerRect =
          this.mapCanvas.containerHTML.getBoundingClientRect();
        const dialogRect = dialog.getBoundingClientRect();
        if (this.dialogPosition.x > containerRect.width / 2) {
          posX = this.dialogPosition.x - dialogRect.width;
        } else {
          posX = this.dialogPosition.x;
        }
        if (this.dialogPosition.y > containerRect.height / 2) {
          posY = this.dialogPosition.y - dialogRect.height;
        } else {
          posY = this.dialogPosition.y;
        }
        dialog.style.transform = `translate(${
          posX - this.dialogPosition.offsetX
        }px, ${posY - this.dialogPosition.offsetY}px)`;
      });
    },
    hoverIndex: function (value) {
      return this.hoverVisibilities.findIndex((item) => item.ref === value);
    },
    showTooltip: function (tooltipNumber) {
      this.$emit("showTooltip", tooltipNumber);
    },
    hideTooltip: function (tooltipNumber) {
      this.$emit("hideTooltip", tooltipNumber);
    },
    dialogPopUpPositionHandler: function (e) {
      e.preventDefault();
      this.dialogPosition.x = e.clientX;
      this.dialogPosition.y = e.clientY;
      if (this.activeDrawTool === "Point") {
        this.dialogCssHacks();
      }
    },
  },
  mounted: function () {
    this.$nextTick(() => {
      this.toolbarCssHacks();
      if (this.mapCanvas) {
        this.mapCanvas.containerHTML
          .querySelector(this.mapCanvas.class)
          .addEventListener("click", this.dialogPopUpPositionHandler, false);
      }
    });
  },
  destroyed: function () {
    if (this.mapCanvas) {
      this.mapCanvas.containerHTML
        .querySelector(this.mapCanvas.class)
        .removeEventListener("click", this.dialogPopUpPositionHandler, false);
    }
  },
};
</script>

<style lang="scss" scoped>
.toolbar-icons {
  background-color: var(--el-color-primary-light-9);
  padding: 4px 4px 2px 4px;
  border-style: solid;
  border-color: var(--el-color-primary-light-5);
  border-radius: 1rem;
  position: absolute;
  right: calc(50vw - 100px);
  bottom: 16px;
  z-index: 10;
}

.drawEdit,
.drawDelete,
.drawPoint,
.drawLineString,
.drawPolygon,
.drawConnection {
  padding: 4px;
  color: var(--el-color-primary-light-5) !important;
}

.icon-button {
  height: 24px !important;
  width: 24px !important;
  color: $app-primary-color;

  &.open-map-button {
    margin-bottom: 4px;
  }

  &:hover {
    cursor: pointer;
  }
}

.active {
  color: var(--el-color-primary) !important;
}

.disabled {
  color: #dddddd !important;
  cursor: not-allowed !important;
}

.connection-dialog {
  position: absolute;
  z-index: 10;
  cursor: move;
}
</style>

<style lang="scss">
.toolbar-container {
  --el-color-primary: #8300bf;
  --el-color-primary-light-5: #cd99e5;
  --el-color-primary-light-9: #f3e6f9;
  --el-color-primary-dark-2: var(--el-color-primary);
}
</style>

<script setup>
import { ref, provide, onMounted, watch } from "vue";

import flatmapTreeData from "../static/FlatmapTreeData.json";
import scaffoldTreeData from "../static/ScaffoldTreeData.json";

/**
 * DrawToolbar
 */
const flatmapToolbarOptions = [
  "Edit",
  "Delete",
  "Point",
  "LineString",
  "Polygon",
  "Connection",
];
const scaffoldToolbarOptions = ["Edit", "Delete", "Point", "LineString"];
const activeDrawTool = ref(undefined);
const activeDrawMode = ref(undefined);
const hoverVisibilities = [
  { value: false, refs: "toolbarPopover", ref: "editPopover" },
  { value: false, refs: "toolbarPopover", ref: "deletePopover" },
  { value: false, refs: "toolbarPopover", ref: "pointPopover" },
  { value: false, refs: "toolbarPopover", ref: "lineStringPopover" },
  { value: false, refs: "toolbarPopover", ref: "polygonPopover" },
  { value: false, refs: "toolbarPopover", ref: "connectionPopover" },
];
const isFlatmap = ref(true);
const appRef = ref(null);
const newlyDrawnEntry = ref({});
const connectionEntry = ref({});
const drawnType = ref("All tools");
const drawnTypes = [
  { value: "All tools", label: "All tools" },
  { value: "Point", label: "Point" },
  { value: "LineString", label: "LineString" },
  { value: "Polygon", label: "Polygon" },
  { value: "None", label: "None" },
];

onMounted(() => {
  console.log("🚀 ~ onMounted ~ appRef:", appRef.value);
});

watch(drawnType, () => {
  finaliseNewDrawn();
});

function toolbarEvent(type, name) {
  console.log("🚀 ~ toolbarEvent ~ type, name:", type, name);
  connectionEntry.value = {};
  if (type === "mode") {
    activeDrawMode.value = name;
  } else if (type === "tool") {
    activeDrawTool.value = name;
  }
}
function startNewDrawn(type) {
  activeDrawTool.value = type;
  newlyDrawnEntry.value = {};
  connectionEntry.value = {};
}
function finishNewDrawn() {
  newlyDrawnEntry.value = {
    id: 1,
    value: "newly drawn entry",
  };
}
function addConnection() {
  connectionEntry.value = {
    " 1026": {
      id: 1026,
      label: "body proper",
      models: "UBERON:0013702",
    },
    " 4958": {
      id: 4958,
      label: "liver",
      models: "UBERON:0002107",
    },
  };
}
function removeConnection() {
  connectionEntry.value = {};
}
function featureTooltip(value) {
  console.log("🚀 ~ featureTooltip ~ value:", value);
}
function finaliseNewDrawn() {
  activeDrawTool.value = undefined;
  newlyDrawnEntry.value = {};
  connectionEntry.value = {};
}
/**
 * HelpModeDialog
 */
const helpMode = ref(false);
const helpModeActiveItem = ref(0);
const helpModeLastItem = ref(false);
const useHelpModeDialog = ref(false);

function showHelpModeDialog() {
  helpMode.value = true;
  useHelpModeDialog.value = true;
}
function onHelpModeShowNext() {
  helpModeActiveItem.value += 1;
  console.log(
    "🚀 ~ onHelpModeShowNext ~ helpModeActiveItem:",
    helpModeActiveItem.value
  );
}
function onFinishHelpMode() {
  helpMode.value = false;
  // reset help mode to default values
  helpModeActiveItem.value = 0;
  helpModeLastItem.value = false;
}
function onActionClick(value) {
  console.log("🚀 ~ onActionClick ~ value:", value);
}

/**
 * Tooltip
 */
const tooltipType = ref("");
const provenanceEntry = ref({});
const featuresAlert = ref(undefined);
const annotationEntry = ref({});
const imageEntry = ref([]);

provide(/* key */ "getFeaturesAlert", /* value */ () => featuresAlert.value);
provide(/* key */ "$annotator", /* value */ undefined);
provide(/* key */ "userApiKey", /* value */ undefined);

function addProvenanceEntry() {
  tooltipType.value = "provenance";
  provenanceEntry.value = {
    destinations: [null],
    origins: [null],
    components: ["pudendal nerve"],
    destinationsWithDatasets: [
      { id: "UBERON:0004917", name: "urethral sphincter" },
    ],
    originsWithDatasets: [
      { id: "UBERON:0022278", name: "nucleus of pudendal nerve" },
    ],
    componentsWithDatasets: [{ id: "UBERON:0011390", name: "pudendal nerve" }],
    title:
      "Nucleus of the pudendal nerve to urethral sphincter via pudendal nerve",
    featureId: ["ilxtr:sparc-nlp/mmset1/1"],
    hyperlinks: [
      {
        url: "https://pubmed.ncbi.nlm.nih.gov/?term=%2F%2Fdoi.org%2F10.1155%252F2012%252F816274",
        id: "pubmed",
      },
    ],
    provenanceTaxonomy: ["NCBITaxon:9606"],
    provenanceTaxonomyLabel: ["Homo sapiens"],
  };
}
function removeProvenanceEntry() {
  tooltipType.value = "";
  provenanceEntry.value = {};
}
function addAnnotationEntry() {
  tooltipType.value = "annotation";
  annotationEntry.value = {
    id: "digestive_8-1",
    featureId: 4958,
    label: "liver",
    models: "UBERON:0002107",
    type: "feature",
    mapUUID: "b650201e-f27a-54a1-84fc-6ec2e7cf4c15",
    resourceId:
      "https://mapcore-demo.org/devel/flatmap/v4/flatmap/b650201e-f27a-54a1-84fc-6ec2e7cf4c15",
  };
}
function removeAnnotationEntry() {
  tooltipType.value = "";
  annotationEntry.value = {};
}
function commitAnnotationEvent(value) {
  console.log("🚀 ~ commitAnnotationEvent ~ value:", value);
}
function addImageEntry() {
  tooltipType.value = "image";
  imageEntry.value = [
    {
      thumbnail: "https://alan-wu-portal-api.herokuapp.com/thumbnail/7696",
      resource:
        "derivative/sub-1-1b/sam-1-1b/september4th1point1b_B1 DRG 1 z_23.jpx",
      id: "238",
      title: "september4th1point1b_B1 DRG 1 z_23.jpx",
      type: "Image",
      link: "https://alan-wu-portal-api.herokuapp.com/thumbnail/7696",
      mimetype: "image/jpx",
      species: ["Mouse"],
      version: "1",
    },
    {
      thumbnail: "https://alan-wu-portal-api.herokuapp.com/thumbnail/7677",
      resource:
        "derivative/sub-33-5d/sam-33-5d/33.5d crbg 130521_well 7_13.jpx",
      id: "238",
      title: "33.5d crbg 130521_well 7_13.jpx",
      type: "Image",
      link: "https://alan-wu-portal-api.herokuapp.com/thumbnail/7677",
      mimetype: "image/jpx",
      species: ["Mouse"],
      version: "1",
    },
    {
      thumbnail: "https://alan-wu-portal-api.herokuapp.com/thumbnail/7677",
      resource:
        "derivative/sub-33-5d/sam-33-5d/33.5d crbg 130521_well 7_13.jpx",
      id: "238",
      title: "33.5d crbg 130521_well 7_13.jpx",
      type: "Image",
      link: "https://alan-wu-portal-api.herokuapp.com/thumbnail/7677",
      mimetype: "image/jpx",
      species: ["Rat"],
      version: "1",
    },
  ];
}
function removeImageEntry() {
  tooltipType.value = "";
  imageEntry.value = [];
}
/**
 * TreeControls
 */
const isReady = ref(true);
const mapType = ref("flatmap");
const flatmapTreeDataEntry = flatmapTreeData;
const scaffoldTreeDataEntry = scaffoldTreeData[0].children;
const treeDataEntry = ref(flatmapTreeDataEntry);

function switchTreeEntry(value) {
  isReady.value = false;
  if (value === "flatmap") {
    mapType.value = "flatmap";
    treeDataEntry.value = flatmapTreeDataEntry;
  } else if (value === "scaffold") {
    mapType.value = "scaffold";
    treeDataEntry.value = scaffoldTreeDataEntry;
  }
  isReady.value = true;
}
function setColourField(treeData, nodeData, activeColour) {
  treeData
    .filter((data) => {
      // Filtering if single node is provided and it does not have children field
      if (nodeData && !data.children) {
        return data.id === nodeData.id;
      } else {
        return true;
      }
    })
    .map((data) => {
      if (data.children) {
        // Using recursive to process nested data if children field exists
        setColourField(data.children, nodeData, activeColour);
      } else {
        // Active colour used for current display
        data["activeColour"] = activeColour;
      }
    });
}
function setColour(nodeData, value) {
  if (nodeData && nodeData.isPrimitives) {
    const activeColour = value ? value : nodeData.defaultColour;
    setColourField(treeDataEntry.value, nodeData, activeColour);
  }
}
function checkAll(value) {
  console.log("🚀 ~ checkAll ~ value:", value);
}
function checkChanged(value) {
  console.log("🚀 ~ checkChanged ~ value:", value);
}
function changeActive(value) {
  console.log("🚀 ~ changeActive ~ value:", value);
}
function changeHover(value) {
  console.log("🚀 ~ changeHover ~ value:", value);
}
</script>

<template>
  <div ref="appRef">
    <div class="maplibregl-canvas"></div>
    <el-row>
      <el-col>
        <h3>DrawToolbar</h3>
      </el-col>
      <el-col>
        <el-switch
          v-model="isFlatmap"
          active-text="Flatmap"
          inactive-text="Scaffold"
        />
      </el-col>
    </el-row>
    <el-row v-show="isFlatmap">
      <el-col>
        <el-select
          v-model="drawnType"
          placeholder="Select"
          style="width: 120px"
        >
          <el-option
            v-for="item in drawnTypes"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-col>
      <el-col>
        <el-button
          v-show="
            (!activeDrawTool || activeDrawTool === 'Point') &&
            (drawnType === 'All tools' ||
              drawnType === 'Point' ||
              drawnType === 'None')
          "
          @click="startNewDrawn('Point')"
          size="small"
        >
          Draw New Point
        </el-button>
        <el-button
          v-show="
            (!activeDrawTool || activeDrawTool === 'LineString') &&
            (drawnType === 'All tools' ||
              drawnType === 'LineString' ||
              drawnType === 'None')
          "
          @click="startNewDrawn('LineString')"
          size="small"
        >
          Draw New LineString
        </el-button>
        <el-button
          v-show="
            (!activeDrawTool || activeDrawTool === 'Polygon') &&
            (drawnType === 'All tools' ||
              drawnType === 'Polygon' ||
              drawnType === 'None')
          "
          @click="startNewDrawn('Polygon')"
          size="small"
        >
          Draw New Polygon
        </el-button>
        <el-button v-show="activeDrawTool" @click="finishNewDrawn" size="small">
          Finish New Drawn
        </el-button>
        <el-button
          v-show="Object.keys(newlyDrawnEntry).length > 0"
          @click="finaliseNewDrawn"
          size="small"
        >
          Finalise New Drawn
        </el-button>
      </el-col>
      <el-col>
        <el-button
          v-show="
            !Object.keys(connectionEntry).length > 0 &&
            (!activeDrawTool || activeDrawTool === 'LineString') &&
            (drawnType === 'All tools' ||
              drawnType === 'LineString' ||
              drawnType === 'None')
          "
          @click="addConnection"
          size="small"
        >
          Add Connection
        </el-button>
        <el-button
          v-show="Object.keys(connectionEntry).length > 0"
          @click="removeConnection"
          size="small"
        >
          Remove Connection
        </el-button>
      </el-col>
    </el-row>
    <el-row>
      <el-col>
        <h3>HelpModeDialog</h3>
        <span v-show="helpMode && useHelpModeDialog"
          >Current item: {{ helpModeActiveItem }}</span
        >
      </el-col>
      <el-col>
        <el-button @click="showHelpModeDialog" size="small">
          Show HelpMode Dialog
        </el-button>
        <el-button
          v-show="helpMode && useHelpModeDialog"
          @click="onHelpModeShowNext"
          size="small"
        >
          Show Next
        </el-button>
        <el-button
          v-show="helpMode && useHelpModeDialog"
          @click="onFinishHelpMode"
          size="small"
        >
          Hide HelpMode Dialog
        </el-button>
      </el-col>
    </el-row>
    <el-row>
      <el-col>
        <h3>Tooltip</h3>
      </el-col>
      <el-col>
        <el-button
          v-show="
            tooltipType === '' ||
            (tooltipType === 'provenance' &&
              Object.keys(provenanceEntry).length === 0)
          "
          @click="addProvenanceEntry"
          size="small"
        >
          Add Provenance Entry
        </el-button>
        <el-button
          v-show="Object.keys(provenanceEntry).length > 0"
          @click="removeProvenanceEntry"
          size="small"
        >
          Remove Provenance Entry
        </el-button>
        <el-button
          v-show="
            tooltipType === '' ||
            (tooltipType === 'annotation' &&
              Object.keys(annotationEntry).length === 0)
          "
          @click="addAnnotationEntry"
          size="small"
        >
          Add Annotation Entry
        </el-button>
        <el-button
          v-show="Object.keys(annotationEntry).length > 0"
          @click="removeAnnotationEntry"
          size="small"
        >
          Remove Annotation Entry
        </el-button>
        <el-button
          v-show="
            tooltipType === '' ||
            (tooltipType === 'image' && Object.keys(imageEntry).length === 0)
          "
          @click="addImageEntry"
          size="small"
        >
          Add Image Entry
        </el-button>
        <el-button
          v-show="Object.keys(imageEntry).length > 0"
          @click="removeImageEntry"
          size="small"
        >
          Remove Image Entry
        </el-button>
      </el-col>
    </el-row>
    <el-row>
      <el-col>
        <h3>TreeControls - {{ mapType }}</h3>
      </el-col>
      <el-col>
        <el-button
          v-show="mapType === 'scaffold'"
          @click="switchTreeEntry('flatmap')"
          size="small"
        >
          Display Flatmap Tree
        </el-button>
        <el-button
          v-show="mapType === 'flatmap'"
          @click="switchTreeEntry('scaffold')"
          size="small"
        >
          Display Scaffold Tree
        </el-button>
      </el-col>
    </el-row>

    <DrawToolbar
      v-show="isFlatmap"
      :mapCanvas="{
        containerHTML: appRef,
        class: '.maplibregl-canvas',
      }"
      :toolbarOptions="flatmapToolbarOptions"
      :drawnType="drawnType"
      :activeDrawTool="activeDrawTool"
      :activeDrawMode="activeDrawMode"
      :newlyDrawnEntry="newlyDrawnEntry"
      :connectionEntry="connectionEntry"
      :hoverVisibilities="hoverVisibilities"
      @clickToolbar="toolbarEvent"
      @featureTooltip="featureTooltip"
      @confirmDrawn="finaliseNewDrawn"
      @cancelDrawn="finaliseNewDrawn"
      ref="toolbarPopover"
    />
    <DrawToolbar
      v-show="!isFlatmap"
      :toolbarOptions="scaffoldToolbarOptions"
      :activeDrawTool="activeDrawTool"
      :activeDrawMode="activeDrawMode"
      :hoverVisibilities="hoverVisibilities"
      @clickToolbar="toolbarEvent"
      ref="toolbarPopover"
    />
    <HelpModeDialog
      v-show="helpMode && useHelpModeDialog"
      class="help-mode-dialog"
      :lastItem="helpModeLastItem"
      @show-next="onHelpModeShowNext"
      @finish-help-mode="onFinishHelpMode"
    />
    <Tooltip
      v-show="tooltipType"
      class="tooltip"
      :tooltipType="tooltipType"
      :provenanceEntry="provenanceEntry"
      :annotationEntry="annotationEntry"
      :imageEntry="imageEntry"
      @annotation="commitAnnotationEvent"
      @onActionClick="onActionClick"
    />
    <TreeControls
      v-show="mapType === 'flatmap'"
      mapType="flatmap"
      title="Systems"
      :treeData="treeDataEntry"
      active=""
      hover=""
      @checkAll="checkAll"
      @checkChanged="checkChanged"
      @changeActive="changeActive"
      @changeHover="changeHover"
    />
    <TreeControls
      v-show="mapType === 'scaffold'"
      mapType="scaffold"
      title="Regions"
      :isReady="isReady"
      :treeData="treeDataEntry"
      :active="[]"
      :hover="[]"
      :showColourPicker="true"
      @setColour="setColour"
      @checkChanged="checkChanged"
    />
  </div>
</template>

<style scoped>
.options-container {
  text-align: center;
}

.help-mode-dialog {
  position: absolute;
  top: 50%;
}

.tooltip {
  width: 400px;
  position: absolute;
  top: calc(50% - 100px);
  left: calc(50% - 200px);
}
</style>

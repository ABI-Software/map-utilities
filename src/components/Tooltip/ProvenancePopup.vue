<template>
  <div v-if="tooltipEntry" class="main" v-loading="loading">
    <div class="block" v-if="tooltipEntry.title">
      <div class="title">{{ capitalise(tooltipEntry.title) }}</div>
      <div
        v-if="
          tooltipEntry.provenanceTaxonomyLabel &&
          tooltipEntry.provenanceTaxonomyLabel.length > 0
        "
        class="subtitle"
      >
        {{ provSpeciesDescription }}
      </div>
    </div>
    <div class="block" v-else>
      <div class="title">{{ tooltipEntry.featureId }}</div>
    </div>
    <div v-if="featuresAlert" class="attribute-title-container">
      <span class="attribute-title">Alert</span>
      <el-popover
        width="250"
        trigger="hover"
        :teleported="false"
        popper-class="popover-origin-help"
      >
        <template #reference>
          <el-icon class="info"><el-icon-warning /></el-icon>
        </template>
        <span style="word-break: keep-all">
          {{ featuresAlert }}
        </span>
      </el-popover>
    </div>
    <div
      v-show="showDetails"
      class="hide"
      id="hide-path-info"
      @click="showDetails = false"
    >
      Hide path information
      <el-icon><el-icon-arrow-up /></el-icon>
    </div>
    <div
      v-show="!showDetails"
      class="hide"
      id="show-path-info"
      @click="showDetails = true"
    >
      Show path information
      <el-icon><el-icon-arrow-down /></el-icon>
    </div>
    <transition name="slide-fade">
      <div v-show="showDetails" class="content-container scrollbar">
        <connectivity-list
          :key="tooltipEntry.featureId[0]"
          :entry="tooltipEntry"
          :origins="origins"
          :components="components"
          :destinations="destinations"
          :originsWithDatasets="originsWithDatasets"
          :componentsWithDatasets="componentsWithDatasets"
          :destinationsWithDatasets="destinationsWithDatasets"
          :availableAnatomyFacets="availableAnatomyFacets"
          @connectivity-action-click="onConnectivityActionClick"
        ></connectivity-list>

        <external-resource-card :resources="resources" v-if="resources.length"></external-resource-card>
      </div>
    </transition>
  </div>
</template>

<script>
import {
  ArrowUp as ElIconArrowUp,
  ArrowDown as ElIconArrowDown,
  Warning as ElIconWarning,
} from '@element-plus/icons-vue'
import EventBus from "../EventBus.js";
import ConnectivityList from '../ConnectivityList/ConnectivityList.vue';
import ExternalResourceCard from './ExternalResourceCard.vue';
import { capitalise, titleCase } from '../utilities.js';

export default {
  name: "ProvenancePopup",
  components: {
    ElIconArrowUp,
    ElIconArrowDown,
    ElIconWarning,
    ConnectivityList,
    ExternalResourceCard,
  },
  props: {
    tooltipEntry: {
      type: Object,
      default: () => ({
        destinations: [],
        origins: [],
        components: [],
        destinationsWithDatasets: [],
        originsWithDatasets: [],
        componentsWithDatasets: [],
        resource: undefined,
      }),
    },
  },
  inject: ["getFeaturesAlert"],
  data: function () {
    return {
      loading: false,
      showDetails: false,
      originDescriptions: {
        motor: "is the location of the initial cell body of the circuit",
        sensory: "is the location of the initial cell body in the PNS circuit",
      },
      origins: [],
      components: [],
      destinations: [],
      originsWithDatasets: [],
      componentsWithDatasets: [],
      destinationsWithDatasets: [],
      availableAnatomyFacets: [],
    };
  },
  watch: {
    tooltipEntry: {
      handler: function (val) {
        this.updateConnectionsData(val);
      },
      immediate: true,
      deep: true,
    }
  },
  computed: {
    featuresAlert() {
      return this.getFeaturesAlert();
    },
    resources: function () {
      let resources = [];
      if (this.tooltipEntry && this.tooltipEntry.hyperlinks) {
        resources = this.tooltipEntry.hyperlinks;
      }
      return resources;
    },
    originDescription: function () {
      if (
        this.tooltipEntry &&
        this.tooltipEntry.title &&
        this.tooltipEntry.title.toLowerCase().includes("motor")
      ) {
        return this.originDescriptions.motor;
      } else {
        return this.originDescriptions.sensory;
      }
    },
    provSpeciesDescription: function () {
      let text = "Studied in";
      this.tooltipEntry.provenanceTaxonomyLabel.forEach((label) => {
        text += ` ${label},`;
      });
      text = text.slice(0, -1); // remove last comma
      text += " species";
      return text;
    },
  },
  mounted: function () {
    this.loadAvailableAnatomyFacets();
    this.updateConnectionsData(this.tooltipEntry);
  },
  methods: {
    titleCase: function (title) {
      return titleCase(title);
    },
    capitalise: function (text) {
      return capitalise(text);
    },
    onConnectivityActionClick: function (data) {
      EventBus.emit('onActionClick', data);
    },
    // Load available anatomy facets from the local storage if available.
    // The data is from Algolia in Sidebar.
    loadAvailableAnatomyFacets: function () {
      const availableAnatomyFacets = localStorage.getItem('available-anatomy-facets');

      if (availableAnatomyFacets) {
        this.availableAnatomyFacets = JSON.parse(availableAnatomyFacets);
      }
    },
    updateConnectionsData: function (source) {
      this.origins = source.origins;
      this.components = source.components;
      this.destinations = source.destinations;
      this.originsWithDatasets = source.originsWithDatasets;
      this.componentsWithDatasets = source.componentsWithDatasets;
      this.destinationsWithDatasets = source.destinationsWithDatasets;
    },
  },
};
</script>

<style lang="scss" scoped>
.display {
  width: 44px;
  word-break: normal;
}

.title {
  text-align: left;
  // width: 16em;
  line-height: 1.5em !important;
  font-size: 18px;
  font-family: Helvetica;
  font-weight: bold;
  padding-bottom: 8px;
  color: $app-primary-color;
}

.block {
  margin-bottom: 0.5em;

  .main > &:first-of-type {
    margin-right: 1em;
  }
}

.pub {
  width: 16rem;
}

.icon {
  right: 0px;
  position: absolute;
  top: 10px;
}

.icon:hover {
  cursor: pointer;
}

:deep(.popover-origin-help.el-popover) {
  text-transform: none !important; // need to overide the tooltip text transform
  border: 1px solid $app-primary-color;
  .el-popper__arrow {
    &:before {
      border-color: $app-primary-color;
      background-color: #ffffff;
    }
  }
}

.info {
  transform: rotate(180deg);
  color: #8300bf;
  margin-left: 8px;
}

.separator {
  width: 90%;
  height: 1px;
  background-color: #bfbec2;
}

.hide {
  color: $app-primary-color;
  cursor: pointer;
  margin-right: 6px;
  margin-top: 3px;
}

.slide-fade-enter-active {
  transition: opacity 0.5s, transform 0.5s;
}
.slide-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.slide-fade-enter, .slide-fade-leave-to /* .slide-fade-leave-active in <2.1.8 */ {
  opacity: 0;
  transform: translateY(-8px);
}

.main {
  font-size: 14px;
  text-align: left;
  line-height: 1.5em;
  font-family: Asap, sans-serif, Helvetica;
  font-weight: 400;
  /* outline: thin red solid; */
  padding: 1em !important;
  overflow: hidden;
  min-width: 16rem;
}

.attribute-title-container {
  margin-bottom: 0.5em;
}

.attribute-title {
  font-size: 16px;
  font-weight: 600;
  /* font-weight: bold; */
  text-transform: uppercase;
}

.attribute-content {
  font-size: 14px;
  font-weight: 500;

  &:last-of-type {
    margin-bottom: 0.5em;
  }
}

.popover-container {
  height: 100%;
  width: 100%;
}

.main {
  .el-button.is-round {
    border-radius: 4px;
    padding: 9px 20px 10px 20px;
    display: flex;
    height: 36px;
  }
}

.button {
  margin-left: 0px !important;
  margin-top: 0px !important;
  font-size: 14px !important;
  background-color: $app-primary-color;
  color: #fff;
  & + .button {
    margin-top: 10px !important;
  }
  &:hover {
    color: #fff !important;
    background: #ac76c5 !important;
    border: 1px solid #ac76c5 !important;
  }
}

.tooltip-container {
  &::after,
  &::before {
    content: "";
    display: block;
    position: absolute;
    width: 0;
    height: 0;
    border-style: solid;
    flex-shrink: 0;
  }
  .tooltip {
    &::after {
      display: none;
    }
    &::before {
      display: none;
    }
  }
}

.maplibregl-popup-anchor-bottom {
  .tooltip-container {
    &::after,
    &::before {
      top: 100%;
      border-width: 12px;
    }
    &::after {
      margin-top: -1px;
      border-color: rgb(255, 255, 255) transparent transparent transparent;
    }
    &::before {
      margin: 0 auto;
      border-color: $app-primary-color transparent transparent transparent;
    }
  }
}

.maplibregl-popup-anchor-top {
  .tooltip-container {
    &::after,
    &::before {
      top: -24px;
      border-width: 12px;
    }
    &::after {
      margin-top: 1px;
      border-color: transparent transparent rgb(255, 255, 255) transparent;
    }
    &::before {
      margin: 0 auto;
      border-color: transparent transparent $app-primary-color transparent;
    }
  }
}

.content-container {
  overflow-y: scroll;
  scrollbar-width: thin !important;
  max-height: 240px;

  .block {
    padding-top: 0.5em;
  }

  .connectivity-list {
    padding-top: 1rem;
  }
}

.scrollbar::-webkit-scrollbar-track {
  border-radius: 10px;
  background-color: #f5f5f5;
}

.scrollbar::-webkit-scrollbar {
  width: 12px;
  right: -12px;
  background-color: #f5f5f5;
}

.scrollbar::-webkit-scrollbar-thumb {
  border-radius: 4px;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.06);
  background-color: #979797;
}

/* Fix for chrome bug where under triangle pops up above one on top of it  */
.selector:not(*:root),
.tooltip-container::after {
  top: 99.4%;
}
</style>

<template>
  <div v-if="entry" class="main" v-loading="loading">
    <div v-if="tooltipEntry.length > 1" class="toggle-button">
      <el-popover width="auto" trigger="hover" :teleported="false">
        <template #reference>
          <el-button
            class="button"
            @click="previous"
            :disabled="this.entryIndex === 0"
          >
            Previous
          </el-button>
        </template>
        <span>{{ previousLabel }}</span>
      </el-popover>
      <el-popover width="auto" trigger="hover" :teleported="false">
        <template #reference>
          <el-button
            class="button"
            @click="next"
            :disabled="this.entryIndex === this.tooltipEntry.length - 1"
          >
            Next
          </el-button>
        </template>
        <span>{{ nextLabel }}</span>
      </el-popover>
    </div>
    <div class="block" v-if="entry.title">
      <div class="title">{{ capitalise(entry.title) }}</div>
      <div
        v-if="
          entry.provenanceTaxonomyLabel &&
          entry.provenanceTaxonomyLabel.length > 0
        "
        class="subtitle"
      >
        {{ provSpeciesDescription }}
      </div>
    </div>
    <div class="block" v-else>
      <div class="title">{{ entry.featureId }}</div>
    </div>
    <div v-if="entry.featuresAlert" class="attribute-title-container">
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
          {{ entry.featuresAlert }}
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
          :key="entry.featureId[0]"
          :entry="entry"
          :origins="origins"
          :components="components"
          :destinations="destinations"
          :originsWithDatasets="originsWithDatasets"
          :componentsWithDatasets="componentsWithDatasets"
          :destinationsWithDatasets="destinationsWithDatasets"
          :availableAnatomyFacets="availableAnatomyFacets"
          @connectivity-action-click="onConnectivityActionClick"
        />
        <external-resource-card
          v-if="resources.length"
          :resources="resources"
        />
      </div>
    </transition>
  </div>
</template>

<script>
import {
  ArrowUp as ElIconArrowUp,
  ArrowDown as ElIconArrowDown,
  Warning as ElIconWarning,
} from "@element-plus/icons-vue";
import EventBus from "../EventBus.js";
import ConnectivityList from "../ConnectivityList/ConnectivityList.vue";
import ExternalResourceCard from "./ExternalResourceCard.vue";
import { capitalise, titleCase } from "../utilities.js";

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
      type: Array,
      default: [],
    },
  },
  data: function () {
    return {
      loading: false,
      showDetails: false,
      originDescriptions: {
        motor: "is the location of the initial cell body of the circuit",
        sensory: "is the location of the initial cell body in the PNS circuit",
      },
      entryIndex: 0,
      availableAnatomyFacets: [],
    };
  },
  computed: {
    entry: function () {
      return this.tooltipEntry[this.entryIndex];
    },
    previousLabel: function () {
      if (this.entryIndex === 0) {
        return "This is the first item. Click 'Next' to see more information.";
      }
      return this.tooltipEntry[this.entryIndex - 1]?.title;
    },
    nextLabel: function () {
      if (this.entryIndex === this.tooltipEntry.length - 1) {
        return "This is the last item. Click 'Previous' to see more information.";
      }
      return this.tooltipEntry[this.entryIndex + 1]?.title;
    },
    provSpeciesDescription: function () {
      let text = "Studied in";
      this.entry.provenanceTaxonomyLabel.forEach((label) => {
        text += ` ${label},`;
      });
      text = text.slice(0, -1); // remove last comma
      text += " species";
      return text;
    },
    origins: function () {
      return this.entry.origins;
    },
    components: function () {
      return this.entry.components;
    },
    destinations: function () {
      return this.entry.destinations;
    },
    originsWithDatasets: function () {
      return this.entry.originsWithDatasets;
    },
    componentsWithDatasets: function () {
      return this.entry.componentsWithDatasets;
    },
    destinationsWithDatasets: function () {
      return this.entry.destinationsWithDatasets;
    },
    resources: function () {
      return this.entry.hyperlinks;
    },
  },
  watch: {
    tooltipEntry: {
      deep: true,
      immediate: true,
      handler: function (newVal, oldVal) {
        if (newVal !== oldVal) {
          this.entryIndex = 0;
        }
      },
    },
  },
  mounted: function () {
    this.loadAvailableAnatomyFacets();
  },
  methods: {
    previous: function () {
      if (this.entryIndex !== 0) {
        this.entryIndex = this.entryIndex - 1;
      }
    },
    next: function () {
      if (this.entryIndex !== this.tooltipEntry.length - 1) {
        this.entryIndex = this.entryIndex + 1;
      }
    },
    titleCase: function (title) {
      return titleCase(title);
    },
    capitalise: function (text) {
      return capitalise(text);
    },
    onConnectivityActionClick: function (data) {
      EventBus.emit("onActionClick", data);
    },
    // Load available anatomy facets from the local storage if available.
    // The data is from Algolia in Sidebar.
    loadAvailableAnatomyFacets: function () {
      const availableAnatomyFacets = localStorage.getItem(
        "available-anatomy-facets"
      );
      if (availableAnatomyFacets) {
        this.availableAnatomyFacets = JSON.parse(availableAnatomyFacets);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.toggle-button {
  display: flex;
  justify-content: space-between;

  .is-disabled {
    color: #fff !important;
    background-color: #ac76c5 !important;
    border: 1px solid #ac76c5 !important;
  }
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

.info {
  transform: rotate(180deg);
  color: #8300bf;
  margin-left: 8px;
}

.hide {
  color: $app-primary-color;
  cursor: pointer;
  margin-right: 6px;
  margin-top: 3px;
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
</style>

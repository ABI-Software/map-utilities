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
        {{ tooltipEntry.paths }}
        <div v-if="tooltipEntry.origins && tooltipEntry.origins.length > 0" class="block">
          <div class="attribute-title-container">
            <span class="attribute-title">Origin</span>
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
                <i>Origin</i> {{ originDescription }}
              </span>
            </el-popover>
          </div>
          <div
            v-for="(origin, i) in tooltipEntry.origins"
            class="attribute-content"
            :origin-item-label="origin"
            :key="origin"
          >
            {{ capitalise(origin) }}
            <div v-if="i != tooltipEntry.origins.length - 1" class="separator"></div>
          </div>
          <el-button
            v-show="
              tooltipEntry.originsWithDatasets && tooltipEntry.originsWithDatasets.length > 0
            "
            class="button"
            id="open-dendrites-button"
            @click="openDendrites"
          >
            Explore origin data
          </el-button>
        </div>
        <div
          v-if="tooltipEntry.components && tooltipEntry.components.length > 0"
          class="block"
        >
          <div class="attribute-title-container">
            <div class="attribute-title">Components</div>
          </div>
          <div
            v-for="(component, i) in tooltipEntry.components"
            class="attribute-content"
            :component-item-label="component"
            :key="component"
          >
            {{ capitalise(component) }}
            <div
              v-if="i != tooltipEntry.components.length - 1"
              class="separator"
            ></div>
          </div>
        </div>
        <div
          v-if="tooltipEntry.destinations && tooltipEntry.destinations.length > 0"
          class="block"
        >
          <div class="attribute-title-container">
            <span class="attribute-title">Destination</span>
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
                <i>Destination</i> is where the axons terminate
              </span>
            </el-popover>
          </div>
          <div
            v-for="(destination, i) in tooltipEntry.destinations"
            class="attribute-content"
            :destination-item-label="destination"
            :key="destination"
          >
            {{ capitalise(destination) }}
            <div
              v-if="i != tooltipEntry.destinations.length - 1"
              class="separator"
            ></div>
          </div>
          <el-button
            v-show="
              tooltipEntry.destinationsWithDatasets &&
              tooltipEntry.destinationsWithDatasets.length > 0
            "
            class="button"
            @click="openAxons"
          >
            Explore destination data
          </el-button>
        </div>

        <el-button
          v-show="
            tooltipEntry.componentsWithDatasets &&
            tooltipEntry.componentsWithDatasets.length > 0
          "
          class="button"
          @click="openAll"
        >
          Search for data on components
        </el-button>

        <external-resource-card :resources="resources" v-if="resources.length"></external-resource-card>
      </div>
    </transition>
  </div>
</template>

<script>
import EventBus from "../EventBus.js";

const titleCase = (str) => {
  return str.replace(/\w\S*/g, (t) => {
    return t.charAt(0).toUpperCase() + t.substr(1).toLowerCase();
  });
};

const capitalise = function (str) {
  if (str) return str.charAt(0).toUpperCase() + str.slice(1);
  return "";
};

export default {
  name: "ProvenancePopup",
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
      controller: undefined,
      activeSpecies: undefined,
      pubmedSearchUrl: "",
      loading: false,
      showToolip: false,
      showDetails: false,
      originDescriptions: {
        motor: "is the location of the initial cell body of the circuit",
        sensory: "is the location of the initial cell body in the PNS circuit",
      },
      componentsWithDatasets: [],
      uberons: [{ id: undefined, name: undefined }],
    };
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
  methods: {
    titleCase: function (title) {
      return titleCase(title);
    },
    capitalise: function (text) {
      return capitalise(text);
    },
    openUrl: function (url) {
      window.open(url, "_blank");
    },
    openAll: function () {
      EventBus.emit("onActionClick", {
        type: "Facets",
        labels: this.tooltipEntry.componentsWithDatasets.map((a) => a.name),
      });
    },
    openAxons: function () {
      EventBus.emit("onActionClick", {
        type: "Facets",
        labels: this.tooltipEntry.destinationsWithDatasets.map((a) => a.name),
      });
    },
    openDendrites: function () {
      EventBus.emit("onActionClick", {
        type: "Facets",
        labels: this.tooltipEntry.originsWithDatasets.map((a) => a.name),
      });
    },
    pubmedSearchUrlUpdate: function (val) {
      this.pubmedSearchUrl = val;
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

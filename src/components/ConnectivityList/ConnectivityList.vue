<template>
  <div class="connectivity-list">
    {{ entry.paths }}
    <div v-if="origins && origins.length > 0" class="block">
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
        v-for="(origin, i) in origins"
        class="attribute-content"
        :origin-item-label="origin"
        :key="origin"
        @mouseenter="onConnectivityHovered(origin)"
        @mouseleave="onConnectivityHovered()"
      >
        <el-icon 
          class="connectivity-search-icon" 
          v-show="validateConnectivity(origin)"
          @click="onConnectivityClicked(origin)"
        >
          <el-icon-search />
        </el-icon>
        <span>{{ capitalise(origin) }}</span>
      </div>
      <el-button
        v-show="
          originsWithDatasets && originsWithDatasets.length > 0 &&
          shouldShowExploreButton(originsWithDatasets)
        "
        class="button"
        id="open-dendrites-button"
        @click="openDendrites"
      >
        Explore origin data
      </el-button>
    </div>
    <div
      v-if="components && components.length > 0"
      class="block"
    >
      <div class="attribute-title-container">
        <span class="attribute-title">Components</span>
      </div>
      <div
        v-for="(component, i) in components"
        class="attribute-content"
        :component-item-label="component"
        :key="component"
        @mouseenter="onConnectivityHovered(component)"
        @mouseleave="onConnectivityHovered()"
      >
        <el-icon 
          class="connectivity-search-icon" 
          v-show="validateConnectivity(component)"
          @click="onConnectivityClicked(component)"
        >
          <el-icon-search />
        </el-icon>
        <span>{{ capitalise(component) }}</span>
      </div>
    </div>
    <div
      v-if="destinations && destinations.length > 0"
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
        v-for="(destination, i) in destinations"
        class="attribute-content"
        :destination-item-label="destination"
        :key="destination"
        @mouseenter="onConnectivityHovered(destination)"
        @mouseleave="onConnectivityHovered()"
      >
        <el-icon 
          class="connectivity-search-icon" 
          v-show="validateConnectivity(destination)"
          @click="onConnectivityClicked(destination)"
        >
          <el-icon-search />
        </el-icon>
        <span>{{ capitalise(destination) }}</span>
      </div>
      <el-button
        v-show="
          destinationsWithDatasets &&
          destinationsWithDatasets.length > 0 &&
          shouldShowExploreButton(destinationsWithDatasets)
        "
        class="button"
        @click="openAxons"
      >
        Explore destination data
      </el-button>
    </div>
    <div
      v-show="
        componentsWithDatasets &&
        componentsWithDatasets.length > 0 &&
        shouldShowExploreButton(componentsWithDatasets)
      "
      class="block"
    >
      <el-button
        class="button"
        @click="openAll"
      >
        Search for data on components
      </el-button>
    </div>

    <div class="connectivity-error-container">
      <div class="connectivity-error" v-show="connectivityError.errorConnectivities">
        <strong>{{ connectivityError.errorConnectivities }}</strong>
        {{ connectivityError.errorMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import {
  Warning as ElIconWarning,
  Search as ElIconSearch,
} from '@element-plus/icons-vue'
import {
  ElButton as Button,
  ElContainer as Container,
  ElIcon as Icon,
} from 'element-plus'
import { capitalise } from '../utilities'

export default {
  name: 'ConnectivityList',
  components: {
    Button,
    Container,
    Icon,
    ElIconWarning,
    ElIconSearch
  },
  props: {
    entry: {
      type: Object,
      default: () => ({
        destinations: [],
        origins: [],
        components: [],
        destinationsWithDatasets: [],
        originsWithDatasets: [],
        componentsWithDatasets: [],
        resource: undefined,
        featuresAlert: undefined,
      }),
    },
    origins: {
      type: Array,
      default: () => []
    },
    components: {
      type: Array,
      default: () => []
    },
    destinations: {
      type: Array,
      default: () => []
    },
    originsWithDatasets: {
      type: Array,
      default: () => []
    },
    componentsWithDatasets: {
      type: Array,
      default: () => []
    },
    destinationsWithDatasets: {
      type: Array,
      default: () => []
    },
    availableAnatomyFacets: {
      type: Array,
      default: () => [],
    },
    connectivityError: {
      type: Object,
      default: () => {},
    }
  },
  data: function () {
    return {
      originDescriptions: {
        motor: 'is the location of the initial cell body of the circuit',
        sensory: 'is the location of the initial cell body in the PNS circuit',
      },
      facetList: [],
    }
  },
  watch: {
    availableAnatomyFacets: {
      handler: function (val) {
        this.convertFacetsToList(val)
      },
      immediate: true,
      deep: true,
    },
  },
  computed: {
    originDescription: function () {
      if (
        this.entry &&
        this.entry.title &&
        this.entry.title.toLowerCase().includes('motor')
      ) {
        return this.originDescriptions.motor
      } else {
        return this.originDescriptions.sensory
      }
    },
  },
  methods: {
    capitalise: function (text) {
      return capitalise(text)
    },
    onConnectivityHovered: function (name) {
      this.$emit('connectivity-hovered', name);
    },
    onConnectivityClicked: function (name) {
      const connectivity = this.connectivityError?.errorConnectivities;
      // Remove the invalid term while searching
      const label = connectivity
        ? name.replace(new RegExp(`\\s*,?\\s*${connectivity}\\s*,?\\s*`, 'gi'), '').trim()
        : name;
      this.$emit('connectivity-clicked', label);
    },
    // validateConnectivity: Checks whether the hovered terms contain valid term or not
    validateConnectivity: function (features) {
      const connectivity = this.connectivityError?.errorConnectivities;
      return connectivity?.toLowerCase() !== features.toLowerCase();
    },
    // shouldShowExploreButton: Checks if the feature is in the list of available anatomy facets
    shouldShowExploreButton: function (features) {
      // facetList will not be available when there has no Sidebar's data
      if (!this.facetList.length) {
        return true
      }
      for (let i = 0; i < features.length; i++) {
        if (this.facetList.includes(features[i].name.toLowerCase())) {
          return true
        }
      }
      return false
    },
    // convertFacetsToList: Converts the available anatomy facets to a list for easy searching
    convertFacetsToList: function (facets) {
      facets.forEach((facet) => {
        if(facet.children) {
          this.convertFacetsToList(facet.children)
        } else {
          this.facetList.push(facet.label.toLowerCase())
        }
      })
    },
    openAll: function () {
      this.$emit('connectivity-action-click', {
        type: 'Facets',
        labels: this.componentsWithDatasets.map((a) => a.name.toLowerCase()),
      })
    },
    openAxons: function () {
      this.$emit('connectivity-action-click', {
        type: 'Facets',
        labels: this.destinationsWithDatasets.map((a) => a.name.toLowerCase()),
      })
    },
    openDendrites: function () {
      this.$emit('connectivity-action-click', {
        type: 'Facets',
        labels: this.originsWithDatasets.map((a) => a.name.toLowerCase()),
      })
    },
  }
}
</script>

<style lang="scss" scoped>
.connectivity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
}

.button {
  margin-left: 0px !important;
  margin-top: 0px !important;
  font-size: 14px !important;
  background-color: $app-primary-color;
  color: #fff;

  &:hover {
    color: #fff !important;
    background-color: #ac76c5 !important;
    border: 1px solid #ac76c5 !important;
  }

  & + .button {
    margin-top: 10px !important;
  }
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
  font-weight: 400;
  font-family: Asap, sans-serif, Helvetica;

  .el-popper__arrow {
    &:before {
      border-color: $app-primary-color;
      background-color: #ffffff;
    }
  }
}

.info {
  color: #8300bf;
  transform: rotate(180deg);
  margin-left: 8px;
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
  display: flex;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.25s ease;
  position: relative;
  cursor: default;

  .connectivity-search-icon {
    display: none;
  }

  &:hover {
    color: $app-primary-color;

    .connectivity-search-icon {
      margin-right: 4px;
      padding-top: 4px;
      cursor: pointer;
      display: block;
    }
  }

  + .attribute-content {
    &::before {
      content: "";
      width: 90%;
      height: 1px;
      background-color: var(--el-border-color);
      position: absolute;
      top: 0;
      left: 0;
    }
  }

  &:last-of-type {
    margin-bottom: 0.5em;
  }
}

.connectivity-error-container {
  position: sticky;
  bottom: 0.5rem;
  width: 100%;
  min-height: 31px; // placeholder
  margin-top: -10px !important;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.connectivity-error {
  width: fit-content;
  font-size: 12px;
  padding: 0.25rem 0.5rem;
  background-color: var(--el-color-error-light-9);
  border-radius: var(--el-border-radius-small);
  border: 1px solid var(--el-color-error);
}
</style>

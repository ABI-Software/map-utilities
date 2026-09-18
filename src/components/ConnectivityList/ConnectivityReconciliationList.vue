<template>
  <div ref="connectivityList" class="connectivity-list">
    <!-- Error Popover -->
    <el-popover
      width="250"
      :show-arrow="false"
      trigger="manual"
      :teleported="true"
      :append-to="connectivityListContainer"
      placement="bottom-start"
      :visible="displayedError.hasError && !!displayedError.errorMessage"
      :popper-class="
        displayedError.errorType === 'warning'
          ? 'connectivity-warning-container'
          : 'connectivity-error-container'
      "
    >
      <template #reference>
        <div
          class="connectivity-alert"
          :style="{ top: alertTop + 'px', left: alertLeft + 'px' }"
        ></div>
      </template>
      <template #default>
        <span v-html="displayedError.errorMessage"></span>
      </template>
    </el-popover>

    <!-- Origins Reconciliation Table -->
    <div v-if="origins && originsCombinations.length > 0" class="block">
      <div class="attribute-title-container">
        <span class="attribute-title">Origin</span>
        <el-popover
          width="250"
          trigger="hover"
          :teleported="true"
          :append-to="connectivityListContainer"
          popper-class="popover-origin-help"
        >
          <template #reference>
            <el-icon class="info"><el-icon-warning /></el-icon>
          </template>
          <span style="word-break: keep-all">
            <i>Origin</i>
            {{ originDescription }}
          </span>
        </el-popover>
      </div>

      <ReconciliationTable
        table-key="origin"
        :groups="groupedOrigins"
        :connectivity-list-container="connectivityListContainer"
        @row-hovered="onRowHovered"
        @connectivity-clicked="onConnectivityClicked"
      />

      <el-button
        v-show="
          originsWithDatasets &&
          originsWithDatasets.length > 0 &&
          shouldShowExploreButton(originsWithDatasets)
        "
        class="button"
        id="open-dendrites-button"
        @click="openDendrites"
      >
        Explore origin data
      </el-button>
    </div>

    <!-- Components Reconciliation Table -->
    <div v-if="components && componentsCombinations.length > 0" class="block">
      <div class="attribute-title-container">
        <span class="attribute-title">Components</span>
      </div>

      <ReconciliationTable
        table-key="component"
        :groups="groupedComponents"
        :connectivity-list-container="connectivityListContainer"
        @row-hovered="onRowHovered"
        @connectivity-clicked="onConnectivityClicked"
      />
    </div>

    <!-- Destinations Reconciliation Table -->
    <div v-if="destinations && destinationsCombinations.length > 0" class="block">
      <div class="attribute-title-container">
        <span class="attribute-title">Destination</span>
        <el-popover
          width="250"
          trigger="hover"
          :teleported="true"
          :append-to="connectivityListContainer"
          popper-class="popover-origin-help"
        >
          <template #reference>
            <el-icon class="info"><el-icon-warning /></el-icon>
          </template>
          <span style="word-break: keep-all">
            <i>Destination</i>
            is where the axons terminate
          </span>
        </el-popover>
      </div>

      <ReconciliationTable
        table-key="destination"
        :groups="groupedDestinations"
        :connectivity-list-container="connectivityListContainer"
        @row-hovered="onRowHovered"
        @connectivity-clicked="onConnectivityClicked"
      />

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

    <!-- Explore Button -->
    <div
      v-show="
        componentsWithDatasets &&
        componentsWithDatasets.length > 0 &&
        shouldShowExploreButton(componentsWithDatasets)
      "
      class="block"
    >
      <el-button class="button" @click="openAll">Search for data on components</el-button>
    </div>
  </div>
</template>

<script>
import { Warning as ElIconWarning } from '@element-plus/icons-vue';
import ReconciliationTable from './ReconciliationTable.vue';

export default {
  name: 'ConnectivityReconciliationList',
  components: {
    ElIconWarning,
    ReconciliationTable,
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
        destinationsCombinations: [],
        originsCombinations: [],
        componentsCombinations: [],
        resource: undefined,
        featuresAlert: undefined,
      }),
    },
    origins: {
      type: Array,
      default: () => [],
    },
    components: {
      type: Array,
      default: () => [],
    },
    destinations: {
      type: Array,
      default: () => [],
    },
    originsWithDatasets: {
      type: Array,
      default: () => [],
    },
    componentsWithDatasets: {
      type: Array,
      default: () => [],
    },
    destinationsWithDatasets: {
      type: Array,
      default: () => [],
    },
    componentsCombinations: {
      type: Array,
      default: () => [],
    },
    originsCombinations: {
      type: Array,
      default: () => [],
    },
    destinationsCombinations: {
      type: Array,
      default: () => [],
    },
    availableAnatomyFacets: {
      type: Array,
      default: () => [],
    },
    connectivityError: {
      type: Object,
      default: () => {},
    },
  },
  data: function () {
    return {
      alertTop: 0,
      alertLeft: 0,
      originDescriptions: {
        motor: 'is the location of the initial cell body of the circuit',
        sensory: 'is the location of the initial cell body in the PNS circuit',
      },
      facetList: [],
      clearErrorTimeout: null,
      connectivityListContainer: null,
      hoverError: {
        errorType: '',
        errorMessage: '',
        hasError: false,
      },
    };
  },
  watch: {
    availableAnatomyFacets: {
      handler: function (val) {
        this.convertFacetsToList(val);
      },
      immediate: true,
      deep: true,
    },
  },
  mounted: function () {
    this.connectivityListContainer = this.$refs.connectivityList;
  },
  computed: {
    originDescription: function () {
      if (this.entry && this.entry.title && this.entry.title.toLowerCase().includes('motor')) {
        return this.originDescriptions.motor;
      } else {
        return this.originDescriptions.sensory;
      }
    },
    // Group origins by mapId - multiple SCKAN terms can map to the same Map term
    groupedOrigins: function () {
      return this.groupCombinationsByMapId(this.originsCombinations);
    },
    // Group components by mapId
    groupedComponents: function () {
      return this.groupCombinationsByMapId(this.componentsCombinations);
    },
    // Group destinations by mapId
    groupedDestinations: function () {
      return this.groupCombinationsByMapId(this.destinationsCombinations);
    },
    displayedError: function () {
      if (this.hoverError.hasError) {
        return this.hoverError;
      }
      return {
        hasError: !!this.connectivityError?.hasError,
        errorType: this.connectivityError?.errorType || '',
        errorMessage: this.connectivityError?.errorMessage || '',
      };
    },
  },
  methods: {
    getCombinationSortLabel: function (combination) {
      return (combination?.sckanLabel || combination?.mapLabel || '').toLowerCase();
    },
    // Group combinations by mapId (or lack thereof)
    // Returns array of groups, each with items array
    groupCombinationsByMapId: function (combinations) {
      const groups = [];
      const mapIdToGroup = new Map();
      const sortedCombinations = [...combinations].sort((a, b) => {
        return this.getCombinationSortLabel(a).localeCompare(this.getCombinationSortLabel(b));
      });

      sortedCombinations.forEach((combo) => {
        if (!combo.mapId || combo.mapId.length === 0) {
          // Unmapped items - each gets its own group (no grouping)
          groups.push({ items: [combo] });
        } else {
          const mapIdKey = JSON.stringify(combo.mapId);

          if (!mapIdToGroup.has(mapIdKey)) {
            const group = { items: [] };
            mapIdToGroup.set(mapIdKey, group);
            groups.push(group);
          }

          mapIdToGroup.get(mapIdKey).items.push(combo);
        }
      });

      return groups;
    },
    onRowHovered: function (combination, event, isMapIdHover = false) {
      if (this.clearErrorTimeout) {
        clearTimeout(this.clearErrorTimeout);
        this.clearErrorTimeout = null;
      }

      // Compute the new error state first
      let newError = { hasError: false, errorType: '', errorMessage: '' };

      if (combination) {
        if (combination.mapId && combination.mapId.length > 0) {
          // If there is mapId, it exists on the map.
          // Show hover highlight on the map.
          const hoveredLabel = combination.mapLabel.toLowerCase();
          this.$emit('connectivity-hovered', hoveredLabel);

          // If the SCKAN term and the Map term are different, show warning message.
          if (
            !isMapIdHover &&
            JSON.stringify(combination.sckanId) !== JSON.stringify(combination.mapId)
          ) {
            newError = {
              hasError: true,
              errorType: 'warning',
              errorMessage: `<strong>${combination.sckanLabel}</strong> from SCKAN
                            has been mapped to <strong>${combination.mapLabel}</strong> on the Map.`,
            };
          }
        } else if (combination.sckanId && combination.sckanId.length > 0) {
          // If there is no mapId but there is sckanId,
          // it means the SCKAN term is not available on the Map.
          newError = {
            hasError: true,
            errorType: 'error',
            errorMessage: `<strong>${combination.sckanLabel}</strong> from SCKAN
                          is not available on the Map.`,
          };
        }
      } else {
        // Mouse leave - clear the hover highlight
        this.$emit('connectivity-hovered', null);
      }

      if (newError.hasError) {
        // Show new error immediately with content
        this.hoverError.errorType = newError.errorType;
        this.hoverError.errorMessage = newError.errorMessage;
        this.hoverError.hasError = true;
      } else {
        // Hide the popover immediately, then clear content after transition (~300ms)
        // so the popover fades out with content still visible (not as empty box)
        this.hoverError.hasError = false;
        this.clearErrorTimeout = setTimeout(() => {
          this.hoverError.errorType = '';
          this.hoverError.errorMessage = '';
          this.clearErrorTimeout = null;
        }, 350);
      }

      if (event) {
        const element = event.currentTarget;
        const rect = element.getBoundingClientRect();
        const containerRect = this.$refs.connectivityList.getBoundingClientRect();

        this.alertTop = rect.top - containerRect.top;
        this.alertLeft = rect.left - containerRect.left + rect.width / 2;
      }
    },
    onConnectivityClicked: function (name) {
      const connectivity = this.connectivityError.errorConnectivities;
      // Remove the invalid term while searching
      const label = connectivity
        ? name.replace(new RegExp(`\\s*,?\\s*${connectivity}\\s*,?\\s*`, 'gi'), '').trim()
        : name;
      this.$emit('connectivity-clicked', label);
    },
    // shouldShowMagnifyGlass: Checks whether the hovered terms contain valid term or not
    shouldShowMagnifyGlass: function (features) {
      const connectivity = this.connectivityError.errorConnectivities;
      return connectivity?.toLowerCase() !== features.toLowerCase();
    },
    // shouldShowExploreButton: Checks if the feature is in the list of available anatomy facets
    shouldShowExploreButton: function (features) {
      // facetList will not be available when there has no Sidebar's data
      if (!this.facetList.length) {
        return true;
      }
      for (let i = 0; i < features.length; i++) {
        if (this.facetList.includes(features[i].name.toLowerCase())) {
          return true;
        }
      }
      return false;
    },
    // convertFacetsToList: Converts the available anatomy facets to a list for easy searching
    convertFacetsToList: function (facets) {
      facets.forEach((facet) => {
        if (facet.children) {
          this.convertFacetsToList(facet.children);
        } else {
          this.facetList.push(facet.label.toLowerCase());
        }
      });
    },
    openAll: function () {
      this.$emit('connectivity-action-click', {
        type: 'Facets',
        labels: this.componentsWithDatasets.map((a) => a.name.toLowerCase()),
      });
    },
    openAxons: function () {
      this.$emit('connectivity-action-click', {
        type: 'Facets',
        labels: this.destinationsWithDatasets.map((a) => a.name.toLowerCase()),
      });
    },
    openDendrites: function () {
      this.$emit('connectivity-action-click', {
        type: 'Facets',
        labels: this.originsWithDatasets.map((a) => a.name.toLowerCase()),
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.connectivity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  font-family: $font-family;
}

.button {
  margin-left: 0px !important;
  margin-top: 0.5rem !important;
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
  text-transform: uppercase;
}

.connectivity-alert {
  position: absolute;
  width: 1px;
  height: 1px;
}

.connectivity-list :deep(.connectivity-error-container.el-popover),
.connectivity-list :deep(.connectivity-warning-container.el-popover) {
  min-height: 31px; // placeholder
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.75rem;
  border-radius: var(--el-border-radius-small);
  pointer-events: none;
  word-break: break-word;
  font-size: 12px;
}

.connectivity-list :deep(.connectivity-error-container.el-popover ul),
.connectivity-list :deep(.connectivity-warning-container.el-popover ul) {
  margin: 0.5em 0 0;
  padding-left: 1.25em;
}

.connectivity-list :deep(.connectivity-error-container.el-popover li + li),
.connectivity-list :deep(.connectivity-warning-container.el-popover li + li) {
  margin-top: 0.25em;
}

.connectivity-list :deep(.connectivity-error-container.el-popover) {
  background-color: var(--el-color-error-light-9);
  border: 1px solid var(--el-color-error);
}

.connectivity-list :deep(.connectivity-warning-container.el-popover) {
  background-color: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning);
}
</style>

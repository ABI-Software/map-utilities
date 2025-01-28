<template>
  <div class="connectivity-graph" v-loading="loading" ref="connectivityGraphRef">

    <div ref="graphCanvas" class="graph-canvas"></div>

    <div class="control-panel control-panel-tools">
      <div class="tools" :class="{'zoom-locked': zoomEnabled}">
        <el-tooltip
          :content="resetLabel"
          placement="top"
          effect="control-tooltip"
          :teleported="true"
          :append-to="connectivityGraphContainer"
        >
          <el-button
            class="control-button"
            size="small"
            @click="reset"
          >
            <el-icon color="white">
              <el-icon-aim />
            </el-icon>
            <span class="visually-hidden">{{ resetLabel }}</span>
          </el-button>
        </el-tooltip>

        <el-tooltip
          :content="zoomLockLabel"
          placement="top"
          effect="control-tooltip"
          :teleported="true"
          :append-to="connectivityGraphContainer"
        >
          <el-button
            class="control-button"
            size="small"
            @click="toggleZoom"
          >
            <el-icon color="white">
              <template v-if="zoomEnabled">
                <el-icon-lock />
              </template>
              <template v-else>
                <el-icon-unlock />
              </template>
            </el-icon>
            <span class="visually-hidden">{{ zoomLockLabel }}</span>
          </el-button>
        </el-tooltip>

        <el-tooltip
          :content="zoomInLabel"
          placement="left"
          effect="control-tooltip"
          :teleported="true"
          :append-to="connectivityGraphContainer"
        >
          <el-button
            class="control-button"
            size="small"
            @click="zoomIn"
          >
            <el-icon color="white">
              <el-icon-zoom-in />
            </el-icon>
            <span class="visually-hidden">{{ zoomInLabel }}</span>
          </el-button>
        </el-tooltip>

        <el-tooltip
          :content="zoomOutLabel"
          placement="left"
          effect="control-tooltip"
          :teleported="true"
          :append-to="connectivityGraphContainer"
        >
          <el-button
            class="control-button"
            size="small"
            @click="zoomOut"
          >
            <el-icon color="white">
              <el-icon-zoom-out />
            </el-icon>
            <span class="visually-hidden">{{ zoomOutLabel }}</span>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <div class="control-panel control-panel-nodes">
      <div class="node-key">
        <!-- <div class="key-head">Node type:</div> -->
        <div class="key-box-container">
          <div class="key-box key-box-dendrite">
            Origin
          </div>
          <div class="key-box key-box-node">
            Components
          </div>
          <div class="key-box key-box-axon">
            Destination
          </div>
          <!--
          <div class="key-box key-box-both">
            Both
          </div>
          -->
        </div>
      </div>
    </div>

    <div v-if="connectivityError" class="connectivity-graph-error">
      <strong v-if="connectivityError.errorConnectivities">
        {{ connectivityError.errorConnectivities }}
      </strong>
      {{ connectivityError.errorMessage }}
    </div>

    <div v-if="loadingError" class="loading-error">
      {{ loadingError }}
    </div>

  </div>
</template>

<script>
import { ConnectivityGraph } from './graph';

const MIN_SCHEMA_VERSION = 1.3;
const CACHE_LIFETIME = 24 * 60 * 60 * 1000; // One day
const RESET_LABEL = 'Reset position';
const ZOOM_LOCK_LABEL = 'Lock zoom';
const ZOOM_UNLOCK_LABEL = 'Unlock zoom';
const ZOOM_IN_LABEL = 'Zoom in';
const ZOOM_OUT_LABEL = 'Zoom out';
const ZOOM_INCREMENT = 0.25;
const APP_PRIMARY_COLOR = '#8300bf';
const ERROR_TIMEOUT = 3000; // 3 seconds

export default {
  name: 'ConnectivityGraph',
  props: {
    /**
     * Entity to load its connectivity graph.
     */
    entry: {
      type: String,
      default: '',
    },
    mapServer: {
      type: String,
      default: '',
    },
    sckanVersion: {
      type: String,
      default: '',
    },
    selectedConnectivityData: {
      type: Array,
      default: [],
    },
  },
  data: function () {
    return {
      loading: true,
      loadingError: '',
      connectivityGraph: null,
      selectedSource: '',
      availableSources: [],
      pathList: [],
      schemaVersion: '',
      knowledgeByPath: new Map(),
      labelledTerms: new Set(),
      labelCache: new Map(),
      resetLabel: RESET_LABEL,
      zoomLockLabel: ZOOM_LOCK_LABEL,
      zoomInLabel: ZOOM_IN_LABEL,
      zoomOutLabel: ZOOM_OUT_LABEL,
      iconColor: APP_PRIMARY_COLOR,
      zoomEnabled: false,
      connectivityError: null,
      timeoutID: undefined,
      connectivityGraphContainer: null,
    };
  },
  mounted() {
    this.showSpinner();
    this.updateTooltipContainer();
    this.refreshCache();
    this.loadCacheData();
    this.run()
      .then((res) => {
        if (res?.success) {
          this.showGraph(this.entry);
        } else if (res?.error) {
          this.loadingError = res.error;
        } else {
          this.loadingError = 'Loading error!';
        }
        this.hideSpinner();
      })
      .catch((error) => {
        this.loadingError = 'Loading error!';
        this.hideSpinner();
      });
  },
  methods: {
    updateTooltipContainer: function () {
      this.connectivityGraphContainer = this.$refs.connectivityGraphRef;
    },
    loadCacheData: function () {
      const availableSources = sessionStorage.getItem('connectivity-graph-sources');
      const labelCache = sessionStorage.getItem('connectivity-graph-labels');
      const pathList = sessionStorage.getItem('connectivity-graph-pathlist');
      const schemaVersion = sessionStorage.getItem('connectivity-graph-schema-version');

      // Use provided SCKAN version for the knowledge source
      if (this.sckanVersion) {
        this.selectedSource = this.sckanVersion;
      }
      sessionStorage.setItem('connectivity-graph-selected-source', this.selectedSource);
      this.updateCacheExpiry();

      if (availableSources) {
        this.availableSources = JSON.parse(availableSources);
      }

      if (pathList) {
        this.pathList = JSON.parse(pathList);
      }

      if (labelCache) {
        const labelCacheObj = JSON.parse(labelCache);
        this.labelCache = new Map(Object.entries(labelCacheObj));
      }

      if (schemaVersion) {
        this.schemaVersion = schemaVersion;
      }
    },
    isValidKnowledgeSource: function () {
      const selectedSource = sessionStorage.getItem('connectivity-graph-selected-source');
      if (this.sckanVersion && (this.sckanVersion !== selectedSource)) {
        return false;
      }
      return true;
    },
    removeAllCacheData: function () {
      const keys = [
        'connectivity-graph-expiry',
        'connectivity-graph-selected-source',
        'connectivity-graph-source', // to clear old data
        'connectivity-graph-sources',
        'connectivity-graph-labels',
        'connectivity-graph-pathlist',
        'connectivity-graph-schema-version',
      ];
      keys.forEach((key) => {
        sessionStorage.removeItem(key);
      });
    },
    refreshCache: function () {
      const expiry = sessionStorage.getItem('connectivity-graph-expiry');
      const now = new Date();
      const validKnowledgeSource = this.isValidKnowledgeSource();

      if (now.getTime() > expiry || !validKnowledgeSource) {
        this.removeAllCacheData();
      }
    },
    updateCacheExpiry: function () {
      const now = new Date();
      const expiry = now.getTime() + CACHE_LIFETIME;

      sessionStorage.setItem('connectivity-graph-expiry', expiry);
    },
    run: async function () {
      if (!this.schemaVersion) {
        this.schemaVersion = await this.getSchemaVersion();
        sessionStorage.setItem('connectivity-graph-schema-version', this.schemaVersion);
        this.updateCacheExpiry();
      }
      if (this.schemaVersion < MIN_SCHEMA_VERSION) {
        return {
          error: `No server available for schema-version ${this.schemaVersion}.`,
        };
      }

      if (!this.availableSources.length) {
        this.availableSources = await this.loadAvailableSources();
      }

      if (!this.isSCKANVersionAvailable()) {
        return {
          error: `No data available for SCKAN version ${this.selectedSource}.`,
        };
      }

      await this.setPathList(this.selectedSource);
      return {
        success: true,
      };
    },
    showGraph: async function (neuronPath) {
      const graphCanvas = this.$refs.graphCanvas;

      this.connectivityGraph = new ConnectivityGraph(this.labelCache, graphCanvas);
      await this.connectivityGraph.addConnectivity(this.knowledgeByPath.get(neuronPath));

      this.connectivityGraph.showConnectivity(graphCanvas);

      // saved state from list view
      if (this.selectedConnectivityData.length) {
        this.connectivityGraph.selectConnectivity(this.selectedConnectivityData);
      }

      this.connectivityGraph.on('tap-node', (event) => {
        const data = event.detail;
        /**
         * This event is triggered after a node on the connectivity graph is clicked.
         */
        this.$emit('tap-node', data);
      });
    },
    query: async function (sql, params) {
      const url = `${this.mapServer}knowledge/query/`;
      const query = { sql, params };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            "Accept": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(query)
        });

        if (!response.ok) {
          throw new Error(`Cannot access ${url}`);
        }

        return await response.json();
      } catch {
        return {
          values: []
        };
      }
    },
    isSCKANVersionAvailable: function () {
      return this.availableSources.includes(this.selectedSource);
    },
    loadAvailableSources: async function () {
      const data = await this.getJsonData(`${this.mapServer}knowledge/sources`);
      const sources = data ? (data.sources || []) : [];
      const filteredSources = sources.filter((source) => source); // filter null values
      sessionStorage.setItem('connectivity-graph-sources', JSON.stringify(filteredSources));
      this.updateCacheExpiry();
      return filteredSources;
    },
    loadPathData: async function (source) {
      const data = await this.query(
        `select entity, knowledge from knowledge
          where entity like 'ilxtr:%' and source=?
          order by entity`,
        [source]);
      const pathList = data ? data.values : [];
      return pathList;
    },
    setPathList: async function (source) {
      if (!this.pathList.length) {
        this.pathList = await this.loadPathData(source);
        sessionStorage.setItem('connectivity-graph-pathlist', JSON.stringify(this.pathList));
        this.updateCacheExpiry();
      }

      this.knowledgeByPath.clear();
      this.labelledTerms = new Set();

      for (const [key, jsonKnowledge] of this.pathList) {
        const knowledge = JSON.parse(jsonKnowledge);
        if ('connectivity' in knowledge) {
          this.knowledgeByPath.set(key, knowledge);
          this.cacheLabels(knowledge);
        }
      }

      if (!this.labelCache.size) {
        await this.getCachedTermLabels();
      }

      return '';
    },
    getSchemaVersion: async function () {
      const data = await this.getJsonData(`${this.mapServer}knowledge/schema-version`);
      return data ? (+data.version || 0) : 0;
    },
    getJsonData: async function (url) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            "Accept": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          console.error(`Cannot access ${url}`);
        }

        return await response.json();
      } catch {
        return null;
      }
    },
    getCachedTermLabels: async function () {
      if (this.labelledTerms.size) {
        const data = await this.query(
          `select entity, knowledge from knowledge
            where entity in (?${', ?'.repeat(this.labelledTerms.size-1)})
            order by source desc`,
          [...this.labelledTerms.values()]
        );

        let last_entity = null;
        for (const [key, jsonKnowledge] of data.values) {
          if (key !== last_entity) {
            const knowledge = JSON.parse(jsonKnowledge);
            this.labelCache.set(key, knowledge['label'] || key);
            last_entity = key;
          }
        }

        const labelCacheObj = Object.fromEntries(this.labelCache);
        sessionStorage.setItem('connectivity-graph-labels', JSON.stringify(labelCacheObj));
        this.updateCacheExpiry();
      }
    },
    cacheNodeLabels: function (node) {
      for (const term of [node[0], ...node[1]]) {
        this.labelledTerms.add(term);
      }
    },
    cacheLabels: async function (knowledge) {
      for (const edge of knowledge.connectivity) {
        this.cacheNodeLabels(edge[0]);
        this.cacheNodeLabels(edge[1]);
      }
    },
    showSpinner: function () {
      this.loading = true;
    },
    hideSpinner: function () {
      this.loading = false;
    },
    reset: function () {
      this.connectivityGraph.reset();
    },
    zoomIn: function () {
      this.connectivityGraph.zoom(ZOOM_INCREMENT);
    },
    zoomOut: function () {
      this.connectivityGraph.zoom(-ZOOM_INCREMENT);
    },
    /**
     * Enable/disable user zoom for scrolling
     */
    toggleZoom: function () {
      this.zoomEnabled = !this.zoomEnabled;
      this.zoomLockLabel = this.zoomEnabled ? ZOOM_UNLOCK_LABEL : ZOOM_LOCK_LABEL;
      this.connectivityGraph.enableZoom(!this.zoomEnabled);
    },
    showErrorMessage: function (connectivityError) {
      this.connectivityError = {...connectivityError};

      if (this.timeoutID) {
        clearTimeout(this.timeoutID);
      }

      this.timeoutID = setTimeout(() => {
        this.connectivityError = null;
      }, ERROR_TIMEOUT);
    },
  },
};
</script>

<style lang="scss" scoped>
.connectivity-graph,
.graph-canvas {
  width: 100%;
  height: 600px;
  background-color: white;
  position: relative;
}

.connectivity-graph {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
  border: solid 1px #e4e7ed;
}

.control-panel {
  position: absolute;
  right: 1rem;

  &-tools {
    top: 1rem;
  }

  &-nodes {
    bottom: 1rem;
  }
}

.node-key {
  padding: 0.5rem;
  font-size: 12px;
  border: 1px solid var(--el-border-color);
  background-color: rgba(#f7faff, 0.85);
}

.key-head {
  text-align: center;
  font-weight: bold;
  border-bottom: 1px solid var(--el-border-color);
  padding-bottom: 4px;
  margin-bottom: 0.5rem;
}

.key-box-container {
  display: flex;
  flex-direction: row;
  gap: 1rem;
}

.key-box {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  position: relative;
  line-height: 1;

  &::before {
    content: "";
    display: block;
    width: 14px;
    height: 14px;
  }

  &-node::before,
  &-both::before {
    border: 1px solid gray;
    border-radius: var(--el-border-radius-small);
  }

  // &-node {
  //   background: #80F0F0;
  // }

  // &-both {
  //   background: gray;
  // }

  &-axon::before {
    border: 1px solid gray;
    border-radius: var(--el-border-radius-small);
    transform: rotate(45deg);
    // background: green;
  }

  &-dendrite::before {
    border: 1px solid gray;
    border-radius: 50%;
    // background: red;
  }
}

.tools {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 0.5rem;

  :deep(.el-button:nth-child(3)) {
    grid-column: 2;
    grid-row: 2;
  }

  :deep(.el-button:nth-child(4)) {
    grid-column: 2;
    grid-row: 3;
  }

  :deep(.el-button:nth-child(3)),
  :deep(.el-button:nth-child(4)) {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateY(-100%);
    transition: all 0.25s ease;
  }

  &.zoom-locked {
    :deep(.el-button:nth-child(3)),
    :deep(.el-button:nth-child(4)) {
      opacity: 1;
      visibility: visible;
      pointer-events: initial;
      transform: translateY(0%);
    }

    :deep(.el-button:nth-child(4)) {
      transition-delay: 0.125s;
    }
  }
}

.control-button {
  width: 24px;
  height: 24px;
  margin: 0 !important;
  padding: 0 !important;
  font-size: 16px !important;
  border-color: $app-primary-color !important;
  border-radius: 50%;
  background: $app-primary-color !important;
  transition: all 0.25s ease;

  svg {
    margin: 0;
  }

  &,
  &:focus,
  &:active {
    box-shadow: none !important;
  }
}

:deep(.cy-graph-tooltip) {
  padding: 4px 10px;
  font-family: Asap;
  font-size: 12px;
  background: #f3ecf6 !important;
  border: 1px solid $app-primary-color;
  border-radius: var(--el-border-radius-base);
  box-shadow: 1px 1px 6px 1px rgba($app-primary-color, 0.15);
  position: relative;
  top: 0;
  left: 0;
  width: fit-content;
  z-index: 1;
}

.connectivity-graph-error {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  width: fit-content;
  font-size: 12px;
  padding: 0.25rem 0.5rem;
  background-color: var(--el-color-error-light-9);
  border-radius: var(--el-border-radius-small);
  border: 1px solid var(--el-color-error);
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

.loading-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-mask-color);
}
</style>

<style lang="scss">
  .el-popper.is-control-tooltip {
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

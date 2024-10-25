<template>
  <div class="connectivity-graph" v-loading="loading">

    <div ref="graphCanvas" class="graph-canvas"></div>

    <div class="control-panel">
      <div class="node-key">
        <div class="key-head">Node type:</div>
        <div>
          <div><span>Node:</span><span class="key-box" style="background: #80F0F0"/></div>
          <div><span>Axon:</span><span class="key-box" style="background: green"/></div>
          <div><span>Dendrite:</span><span class="key-box" style="background: red"/></div>
          <div><span>Both:</span><span class="key-box" style="background: gray"/></div>
        </div>
      </div>
      <div class="tools">
        <el-tooltip
          :content="resetLabel"
          placement="bottom"
          effect="control-tooltip"
        >
          <el-button
            class="control-button"
            :class="theme"
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
          placement="bottom"
          effect="control-tooltip"
        >
          <el-button
            class="control-button"
            :class="theme"
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
      </div>
    </div>

    <div class="connectivity-graph-error" v-if="errorMessage">
      {{ errorMessage }}
    </div>

  </div>
</template>

<script>
import { ConnectivityGraph } from './graph';

const MIN_SCHEMA_VERSION = 1.3;
const CACHE_LIFETIME = 24 * 60 * 60 * 1000; // One day
const RESET_LABEL = 'Reset position';
const ZOOM_LOCK_LABEL = 'Lock zoom (to scroll)';
const ZOOM_UNLOCK_LABEL = 'Unlock zoom';
const APP_PRIMARY_COLOR = '#8300bf';

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
  },
  data: function () {
    return {
      loading: true,
      connectivityGraph: null,
      selectedSource: '',
      pathList: [],
      schemaVersion: '',
      knowledgeByPath: new Map(),
      labelledTerms: new Set(),
      labelCache: new Map(),
      resetLabel: RESET_LABEL,
      zoomLockLabel: ZOOM_LOCK_LABEL,
      iconColor: APP_PRIMARY_COLOR,
      zoomEnabled: false,
      errorMessage: '',
    };
  },
  mounted() {
    this.refreshCache();
    this.loadCacheData();
    this.run().then((res) => {
      this.showGraph(this.entry);
    });
  },
  methods: {
    loadCacheData: function () {
      const selectedSource = sessionStorage.getItem('connectivity-graph-source');
      const labelCache = sessionStorage.getItem('connectivity-graph-labels');
      const pathList = sessionStorage.getItem('connectivity-graph-pathlist');
      const schemaVersion = sessionStorage.getItem('connectivity-graph-schema-version');

      if (selectedSource) {
        this.selectedSource = selectedSource;
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
    removeAllCacheData: function () {
      const keys = [
        'connectivity-graph-expiry',
        'connectivity-graph-source',
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

      if (now.getTime() > expiry) {
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
        console.warn('No Server!');
        return;
      }
      this.showSpinner();
      if (!this.selectedSource) {
        this.selectedSource = await this.setSourceList();
        sessionStorage.setItem('connectivity-graph-source', this.selectedSource);
        this.updateCacheExpiry();
      }
      await this.setPathList(this.selectedSource);
      this.hideSpinner();
    },
    showGraph: async function (neuronPath) {
      const graphCanvas = this.$refs.graphCanvas;

      this.showSpinner();

      this.connectivityGraph = new ConnectivityGraph(this.labelCache, graphCanvas);
      await this.connectivityGraph.addConnectivity(this.knowledgeByPath.get(neuronPath));

      this.hideSpinner();

      this.connectivityGraph.showConnectivity(graphCanvas);

      this.connectivityGraph.on('tap-node', (event) => {
        const { label } = event.detail;
        const labels = label ? label.split(`\n`) : [];
        /**
         * This event is triggered after a node on the connectivity graph is clicked.
         */
        this.$emit('tap-node', labels);
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
    setSourceList: async function () {
      const data = await this.getJsonData(`${this.mapServer}knowledge/sources`);
      const sources = data ? (data.sources || []) : [];

      // Order with most recent first...
      let firstSource = '';
      const sourceList = [];

      for (const source of sources) {
        if (source) {
          sourceList.push(source);

          if (firstSource === '') {
            firstSource = source;
          }
        }
      }

      return firstSource;
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
    /**
     * Enable/disable user zoom for scrolling
     */
    toggleZoom: function () {
      this.zoomEnabled = !this.zoomEnabled;
      this.zoomLockLabel = this.zoomEnabled ? ZOOM_UNLOCK_LABEL : ZOOM_LOCK_LABEL;
      this.connectivityGraph.enableZoom(!this.zoomEnabled);
    },
    showErrorMessage: function (errorMessage) {
      this.errorMessage = errorMessage;
      // Show error for 3 seconds
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
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
  top: 1rem;
  right: 1rem;
}

.node-key {
  padding: 0.5rem;
  font-size: 12px;
  border: 1px solid var(--el-border-color);
  background-color: rgba(#f7faff, 0.85);

  div div {
    width: 90px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.key-head {
  text-align: center;
  font-weight: bold;
  border-bottom: 1px solid var(--el-border-color);
  padding-bottom: 4px;
  margin-bottom: 0.5rem;
}

.key-box {
  display: block;
  width: 12px;
  height: 12px;
}

.tools {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  align-items: flex-end;
  justify-content: flex-end;
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

<template>
  <div class="resource-container">
    <template v-for="resource in resources" :key="resource.id">
      <div class="resource">
        <el-button
          v-if="resource.id === 'pubmed'"
          class="button"
          id="open-pubmed-button"
          :icon="ElIconNotebook"
          @click="openUrl(resource.url)"
        >
          Open publications in PubMed
        </el-button>
      </div>
    </template>
  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */
import { shallowRef } from "vue";
import { Notebook as ElIconNotebook } from "@element-plus/icons-vue";

import EventBus from "../EventBus.js";

export default {
  name: "ExternalResourceCard",
  props: {
    resources: {
      type: Array,
      default: () => [],
    },
  },
  data: function () {
    return {
      pubmeds: [],
      pubmedIds: [],
      ElIconNotebook: shallowRef(ElIconNotebook),
    };
  },
  methods: {
    capitalise: function (string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    },
    openUrl: function (url) {
      EventBus.emit("open-pubmed-url", url);
      window.open(url, "_blank");
    },
  },
};
</script>

<style lang="scss" scoped>
.attribute-title {
  font-size: 16px;
  font-weight: 600;
  /* font-weight: bold; */
  text-transform: uppercase;
}

.attribute-content {
  font-size: 14px;
  font-weight: 400;
}

.el-link {
  color: $app-primary-color;
  text-decoration: none;
  word-wrap: break-word;
  &:hover,
  &:focus {
    color: $app-primary-color;
  }
}

:deep(.el-carousel__button) {
  background-color: $app-primary-color;
}

.attribute-title {
  font-size: 16px;
  font-weight: 600;
  /* font-weight: bold; */
  text-transform: uppercase;
}

.button {
  margin-left: 0px !important;
  margin-top: 0px !important;
  font-size: 14px !important;
  background-color: $app-primary-color;
  color: #fff;
  &:hover {
    color: #fff !important;
    background: #ac76c5 !important;
    border: 1px solid #ac76c5 !important;
  }
  & + .button {
    margin-top: 10px !important;
    background-color: $app-primary-color;
    color: #fff;
  }
}
</style>

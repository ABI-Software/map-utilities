<template>
  <div class="reference-button-container">
    <el-button
      class="reference-icon-button"
      size="small"
      @click="$emit('show-related-connectivities', resource)"
    >
      Show related connectivities
    </el-button>
  </div>
</template>

<script>
export default {
  name: 'RelatedConnectivitiesButton',
  props: {
    resource: {
      type: String,
      required: true,
    },
  },
};
</script>

<style lang="scss" scoped>
.reference-button-container {
  margin-top: 0.5rem;
  font-family: $font-family;
}

.reference-icon-button {
  color: $app-primary-color !important;
  background-color: #f9f2fc !important;
  border-color: $app-primary-color !important;

  &:hover {
    background-color: transparent !important;
  }
}
</style>

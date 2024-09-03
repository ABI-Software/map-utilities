<template>
  <div class="main">
    <div v-if="imageEntry">
      <el-tag
        v-for="(species, index) in speciesFilterTags"
        :key="index"
        type="info"
        class="tag"
        :class="{ 'active-tag': species.name === activeSpecies.name }"
        :closable="species.name === activeSpecies.name"
        @close="removeSpeciesFilterTag"
        @click="filterBySpecies(species)"
      >
        {{ species.name }} ({{ species.count }})
      </el-tag>
      <div class="gallery-container">
        <Gallery :items="imageItems" :imageStyle="imageStyle" />
      </div>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */
import { ElTag as Tag } from "element-plus";

import Gallery from "@abi-software/gallery";
import "@abi-software/gallery/dist/style.css";

export default {
  name: "ImageGalleryPopup",
  components: {
    Tag,
    Gallery,
  },
  props: {
    imageEntry: {
      type: Array,
      default: [],
    },
  },
  data: function () {
    return {
      activeSpecies: { name: "" },
      speciesFilterTags: [],
      imageItems: [],
      showImageGallery: false,
    };
  },
  computed: {
    imageStyle() {
      return {
        width: "180px",
        height: "135px",
      };
    },
  },
  watch: {
    imageEntry: {
      handler: function (value) {
        if (value) {
          this.populateFilterTags();
          this.imageItems = this.imageEntry;
        }
      },
      deep: true,
    },
  },
  methods: {
    removeSpeciesFilterTag: function () {
      this.activeSpecies = { name: "" };
      this.imageItems = this.imageEntry;
    },
    filterBySpecies: function (tagInfo) {
      this.activeSpecies = tagInfo;
      let filteredImageItems = [];
      this.imageEntry.forEach((image) => {
        if (image.species && image.species.length) {
          image.species.forEach((species) => {
            if (species === tagInfo.name) {
              filteredImageItems.push(image);
            }
          });
        }
      });
      this.imageItems = filteredImageItems;
    },
    populateFilterTags: function () {
      let imageObjects = {};
      this.imageEntry.forEach((image) => {
        if (image.species && image.species.length) {
          image.species.forEach((species) => {
            if (!(species in imageObjects)) {
              imageObjects[species] = {
                name: species,
                count: 0,
              };
            }
            imageObjects[species].count++;
          });
        }
      });
      this.speciesFilterTags = Object.values(imageObjects);
    },
  },
  mounted: function () {
    this.populateFilterTags();
    this.imageItems = this.imageEntry;
  },
};
</script>

<style lang="scss" scoped>
.block {
  margin-bottom: 0.5em;
}

.tag {
  margin-right: 5px;
  margin-bottom: 5px;
  cursor: pointer;
}

.active-tag {
  background-color: $app-primary-color;
  color: #fff;
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
  min-width: 18rem;
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

.gallery-container {
  :deep(.gallery) {
    .gallery-strip {
      padding: 1rem 0;
    }

    > div {
      min-height: max-content !important;
    }
  }
}
</style>

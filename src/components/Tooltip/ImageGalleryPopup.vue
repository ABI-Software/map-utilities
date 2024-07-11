<template>
  <div class="main" v-loading="loading">
      <!-- <div class="block" v-if="entry.title">
        <span class="title">{{ capitalise(entry.title) }}</span>
      </div> -->
      <div class="block">
        <el-button
          class="button"
          @click="showImages = !showImages"
        >
          <span v-if="showImages">Hide images</span>
          <span v-else>View images at this location (Gallery)</span>
        </el-button>
        <template :key="index" v-for="(species, index) in speciesFilterTags">
          <el-tag
            type="info"
            class="tag"
            :class="{ 'active-tag': species.taxon === activeSpecies.taxon}"
            @close="removeSpeciesFilterTag(species)"
            @click="filterBySpecies(species)"
            :closable="species.taxon === activeSpecies.taxon"
          >
            {{ species.name }} ({{ species.count }})
          </el-tag>
        </template>
        <div v-if="showImages" class="image-gallery-container">
          <Gallery  class="gallery" :items="filteredItems" />
        </div>
        <el-button
          class="button"
          @click="viewImage(imageIframeURL[this.entry.featureId[0]])"
        >
          <span>View images at this location (iFrame)</span>
        </el-button>
    </div>
  </div>
</template>

<script>
import Gallery from "@abi-software/gallery";
import "@abi-software/gallery/dist/style.css";
import {
  ArrowUp as ElIconArrowUp,
  ArrowDown as ElIconArrowDown,
  Warning as ElIconWarning,
} from '@element-plus/icons-vue'
/* eslint-disable no-alert, no-console */
import {
  ElButton as Button,
  ElContainer as Container,
  ElIcon as Icon,
  ElTag as Tag,
} from 'element-plus'

import flatmapImageMixin from '../../mixins/flatmapImageMixin';

const titleCase = (str) => {
  return str.replace(/\w\S*/g, (t) => {
    return t.charAt(0).toUpperCase() + t.substr(1).toLowerCase()
  })
}

const capitalise = function (str) {
  if (str) return str.charAt(0).toUpperCase() + str.slice(1)
  return ''
}

const imageIframeURL = {
  'UBERON:0000948': 'https://sparc.biolucida.net/image?c=MjIzNzItY29sLTI1NA%3D%3D',
  'UBERON:0016508': 'https://sparc.biolucida.net/image?c=MjIzNzQtY29sLTI1NA%3D%3D',
  'ILX:0793082': 'https://sparc.biolucida.net/image?c=MjIzNzUtY29sLTI1NA%3D%3D'
}

export default {
  name: 'ImageGalleryPopup',
  mixins: [flatmapImageMixin],
  components: {
    Button,
    Container,
    Icon,
    Tag,
    ElIconArrowUp,
    ElIconArrowDown,
    ElIconWarning,
    Gallery,
  },
  props: {
    galleryItems: {
      type: Array,
      default: () => [],
    },
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
      }),
    },
  },
  data: function () {
    return {
      controller: undefined,
      activeSpecies: undefined,
      loading: false,
      showImages: false,
      activeSpecies: { taxon: '', name: ''},
      imageIframeURL: imageIframeURL,
      speciesFilterTags: [],
      filteredItems: [],
    }
  },
  watch: {
    galleryItems: {
      handler: function () {
        this.populateSpeciesFilterTags()
      },
      deep: true,
    },
  },
  methods: {
    removeSpeciesFilterTag: function (species) {
      this.activeSpecies = { taxon: '', name: '' }
      this.filteredItems = this.galleryItems
    },
    populateSpeciesFilterTags: function () {
      this.speciesFilterTags = this.findAllSpeciesFromGalleryItems(this.galleryItems)
    },
    filterBySpecies: function (species) {
      this.activeSpecies = species
      this.filteredItems = this.findImagesForSpeciesFromGalleryItems(this.galleryItems, species.taxon)
    },
    titleCase: function (title) {
      return titleCase(title)
    },
    capitalise: function (text) {
      return capitalise(text)
    },
    viewImage: function (url) {
      this.$emit('view-image', url)
    }
  },
  mounted: function () {
    this.populateSpeciesFilterTags()
    this.filteredItems = this.galleryItems
  },
}
</script>

<style lang="scss" scoped>

.display {
  width: 44px;
  word-break: normal;
}

.title {
  text-align: left;
  width: 16em;
  line-height: 1.5em !important;
  font-size: 1em;
  font-family: Helvetica;
  font-weight: 500;
  /* font-weight: bold; */
  padding-bottom: 8px;
}

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

.icon {
  right: 0px;
  position: absolute;
  top: 10px;
}

.icon:hover {
  cursor: pointer;
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

.title {
  font-size: 18px;
  font-weight: 500;
  font-weight: bold;
  padding-bottom: 8px;
  color: rgb(131, 0, 191);
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
    content: '';
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

.image-gallery-container {
  :deep(.gallery) {
    .gallery-strip {
      padding: 1rem 0;
    }

    > div {
      min-height: max-content !important;
    }
  }
}

/* Fix for chrome bug where under triangle pops up above one on top of it  */
.selector:not(*:root),
.tooltip-container::after {
  top: 99.4%;
}
</style>

<template>
  <div class="image-dialog" v-if="imageIframeOpen">
    <div class="map-iframe-container">
      <iframe
        class="my-iframe"
        :src="imageIframeURL">
      </iframe>
    </div>
    <button
      class="image-dialog-close"
      @click="closeImageIframe"
    >
      Close
    </button>
  </div>
</template>

<script>
  export default {
    name: 'IframeImageDialog',
    props: {
      imageIframeOpen: false,
      imageIframeURL: ''
    },
    methods: {
      closeImageIframe: function () {
        this.$emit('closeImageIframe')
      },
    }
  }
</script>

<style lang="scss" scoped>
  .image-dialog {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(#000, 0.9);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;

    .image-dialog-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      padding: 4px;
      border: 2px solid;
      border-radius: 4px;
    }

    .map-iframe-container {
      height: 80%;
      width: 80%;
      background: #fff;
      border: 1px solid black;
      overflow: hidden;
    }

    .my-iframe {
      height:100%;
      width:100%;
      position:relative;
      border-width:0px;
    }
  }
</style>

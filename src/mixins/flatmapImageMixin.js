export default {
  // Note that the setting store is included in MapContent.vue
  methods: {
    findImagesForSpeciesFromGalleryItems: function (galleryItems, speciesToFind) {
      let imageList = []
      galleryItems.forEach((image) => {
        if (image.species && image.species.length > 0) {
          image.species.forEach((species) => {
            if (species.species && species.species.curie === speciesToFind) {
              imageList.push(image)
            }
          })
        }
      })
      return imageList
    },
    findAllSpeciesFromGalleryItems: function (galleryItems) {
      let speciesList = [];
      let speciesSet = new Set();

      galleryItems.forEach((image) => {
        if (image.species && image.species.length > 0) {
          image.species.forEach((species) => {
            if (species.species) {
              let ispc = species.species;
              if (!speciesSet.has(ispc.curie)) {
                speciesSet.add(ispc.curie);
                speciesList.push({ 'taxon': ispc.curie, 'name': ispc.name, 'count': 1});
              } else {
                speciesList.forEach((sp) => {
                  if (sp.taxon === ispc.curie) sp.count++;
                });
              }
            }
          });
        }
      });

      return speciesList;
    },
  }
}

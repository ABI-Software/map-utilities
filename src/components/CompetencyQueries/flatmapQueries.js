const CachedTaxonLabels = [];

async function findTaxonomyLabels(mapImp, taxonomies) {
  const intersectionTaxonomies = taxonomies.filter((taxonomy) =>
    CachedTaxonLabels.some((obj) => obj.taxon === taxonomy),
  );

  const foundCachedTaxonLabels = CachedTaxonLabels.filter((obj) =>
    intersectionTaxonomies.includes(obj.taxon),
  );

  const leftoverTaxonomies = taxonomies.filter(
    (taxonomy) => !intersectionTaxonomies.includes(taxonomy),
  );

  if (!leftoverTaxonomies.length) {
    return foundCachedTaxonLabels;
  } else {
    const entityLabels = await mapImp.queryLabels(leftoverTaxonomies);
    if (entityLabels.length) {
      entityLabels.forEach((entityLabel) => {
        let { entity: taxon, label } = entityLabel;
        if (label === 'Mammalia') {
          label = 'Mammalia not otherwise specified';
        }
        const item = { taxon, label };
        foundCachedTaxonLabels.push(item);
        CachedTaxonLabels.push(item);
      });
      return foundCachedTaxonLabels;
    }
  }
}

export { findTaxonomyLabels };

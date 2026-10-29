// taxon => label
const CachedTaxonLabels = new Map();
// taxon => in-flight queryLabels promise, shared by concurrent callers
const PendingTaxonLabels = new Map();

async function findTaxonomyLabels(mapImp, taxonomies) {
  const uniqueTaxonomies = [...new Set(taxonomies)];
  const leftoverTaxonomies = uniqueTaxonomies.filter(
    (taxonomy) => !CachedTaxonLabels.has(taxonomy) && !PendingTaxonLabels.has(taxonomy),
  );

  if (leftoverTaxonomies.length) {
    const request = mapImp
      .queryLabels(leftoverTaxonomies)
      .then((entityLabels) => {
        (entityLabels || []).forEach((entityLabel) => {
          let { entity: taxon, label } = entityLabel;
          if (label === 'Mammalia') {
            label = 'Mammalia not otherwise specified';
          }
          CachedTaxonLabels.set(taxon, label);
        });
      })
      .finally(() => {
        leftoverTaxonomies.forEach((taxonomy) => PendingTaxonLabels.delete(taxonomy));
      });
    leftoverTaxonomies.forEach((taxonomy) => PendingTaxonLabels.set(taxonomy, request));
  }

  const pending = new Set(
    uniqueTaxonomies.map((taxonomy) => PendingTaxonLabels.get(taxonomy)).filter(Boolean),
  );
  await Promise.all(pending);

  return uniqueTaxonomies
    .filter((taxonomy) => CachedTaxonLabels.has(taxonomy))
    .map((taxon) => ({ taxon, label: CachedTaxonLabels.get(taxon) }));
}

export { findTaxonomyLabels };

// origins = ilxtr:hasSomaLocatedIn
// destinations = ilxtr:hasAxonPresynapticElementIn, ilxtr:hasAxonSensorySubcellularElementIn
// via = ilxtr:hasAxonLeadingToSensorySubcellularElementIn, ilxtr:hasAxonLocatedIn

import { findTaxonomyLabels } from './flatmapQueries';

async function query(flatmapAPI, sql, params) {
  const url = `${flatmapAPI}knowledge/query/`;
  const query = { sql, params };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json; charset=utf-8',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      throw new Error(`Cannot access ${url}`);
    }

    return await response.json();
  } catch {
    return {
      values: [],
    };
  }
}

async function fetchLabels(flatmapAPI, labelledTerms) {
  if (!labelledTerms.length) return [];

  const data = await query(
    flatmapAPI,
    `select entity, knowledge from knowledge
      where entity in (?${', ?'.repeat(labelledTerms.length - 1)})
      order by source desc`,
    [...labelledTerms],
  );

  return await data.values;
}

function filterOrigins(item) {
  const soma = item['node-phenotypes']?.['ilxtr:hasSomaLocatedIn'];
  return (
    Array.isArray(item.connectivity) &&
    item.connectivity.length > 0 &&
    Array.isArray(soma) &&
    soma.length > 0
  );
}

function filterDestinations(item) {
  const axonPresyn = item['node-phenotypes']?.['ilxtr:hasAxonPresynapticElementIn'];
  const axonSensory = item['node-phenotypes']?.['ilxtr:hasAxonSensorySubcellularElementIn'];
  const hasDest =
    (Array.isArray(axonPresyn) && axonPresyn.length > 0) ||
    (Array.isArray(axonSensory) && axonSensory.length > 0);
  return Array.isArray(item.connectivity) && item.connectivity.length > 0 && hasDest;
}

function filterViaLocations(item) {
  if (!Array.isArray(item.connectivity) || item.connectivity.length === 0) return false;

  const origins = new Set(
    (item['node-phenotypes']?.['ilxtr:hasSomaLocatedIn'] || []).map((arr) => arr[0]),
  );
  const destinations = new Set([
    ...(item['node-phenotypes']?.['ilxtr:hasAxonPresynapticElementIn'] || []).map((arr) => arr[0]),
    ...(item['node-phenotypes']?.['ilxtr:hasAxonSensorySubcellularElementIn'] || []).map(
      (arr) => arr[0],
    ),
  ]);

  return item.connectivity.some((pair) => {
    const [from, to] = pair;
    const fromId = from[0];
    const toId = to[0];
    return !origins.has(fromId) && !destinations.has(toId);
  });
}

function getConnectivityItems(obj) {
  if (!Array.isArray(obj.connectivity)) return [];
  const items = new Set();

  obj.connectivity.forEach((pair) => {
    if (Array.isArray(pair) && pair.length) {
      pair.forEach((endpoint) => {
        if (Array.isArray(endpoint) && typeof endpoint[0] === 'string') {
          const stringifyEndpoint = JSON.stringify(endpoint);
          items.add(stringifyEndpoint);
        }
      });
    }
  });
  return Array.from(items);
}

function getPhenotypeItems(obj, prop) {
  const arr = obj['node-phenotypes']?.[prop];
  if (!Array.isArray(arr)) return [];
  return arr;
}

async function transformResults(flatmapAPI, knowledgeSource, results) {
  const baseResults = Array.from(
    new Map(results.map((item) => [JSON.stringify(item), item])).values(),
  );
  const terms = baseResults.flat(Infinity);
  const uniqueTerms = [...new Set(terms)];
  const fetchResults = await fetchLabels(flatmapAPI, uniqueTerms);
  // const objectResults = fetchResults.map((item) => JSON.parse(item[1]));
  const objectResults = fetchResults.reduce((arr, item) => {
    const id = item[0];
    const valObj = JSON.parse(item[1]);
    arr.push({ id, label: valObj.label, source: valObj.source });
    return arr;
  }, []);

  // sort matched knowledgeSource items for same id
  objectResults.sort((a, b) => {
    if (a.id === b.id) {
      if (a.source === knowledgeSource && b.source !== knowledgeSource) return -1;
      if (a.source !== knowledgeSource && b.source === knowledgeSource) return 1;
      return 0;
    }
    return a.id.localeCompare(b.id);
  });

  const nodes = [];
  const formattedResults = baseResults.map((item) => {
    const itemPair = item.flat();
    const labels = [];
    for (let i = 0; i < itemPair.length; i++) {
      const foundObj = objectResults.find((obj) => obj.id === itemPair[i]);
      if (foundObj) {
        labels.push(foundObj.label);
        if (i > 0) {
          nodes.push({
            key: [itemPair[i], []],
            label: foundObj.label,
          });
        }
      }
    }
    return {
      key: item,
      label: labels.join(', '),
    };
  });
  // unique results by combining formattedResults and nodes
  // but filter out duplicates based on the labels
  const uniqueResults = [...formattedResults, ...nodes].filter(
    (result, index, self) => index === self.findIndex((r) => r.label === result.label),
  );
  return uniqueResults;
}

async function extractOriginItems(flatmapAPI, knowledgeSource, knowledge) {
  const results = [];
  knowledge.forEach((obj) => {
    if (!Array.isArray(obj.connectivity) || obj.connectivity.length === 0) return;
    const connectivityItems = new Set(getConnectivityItems(obj));
    getPhenotypeItems(obj, 'ilxtr:hasSomaLocatedIn').forEach((item) => {
      const stringifyItem = JSON.stringify(item);
      if (connectivityItems.has(stringifyItem)) results.push(item);
    });
  });
  return await transformResults(flatmapAPI, knowledgeSource, results);
}

async function extractDestinationItems(flatmapAPI, knowledgeSource, knowledge) {
  const results = [];
  knowledge.forEach((obj) => {
    if (!Array.isArray(obj.connectivity) || obj.connectivity.length === 0) return;
    const connectivityItems = new Set(getConnectivityItems(obj));
    [
      ...getPhenotypeItems(obj, 'ilxtr:hasAxonPresynapticElementIn'),
      ...getPhenotypeItems(obj, 'ilxtr:hasAxonSensorySubcellularElementIn'),
    ].forEach((item) => {
      const stringifyItem = JSON.stringify(item);
      if (connectivityItems.has(stringifyItem)) results.push(item);
    });
  });
  return await transformResults(flatmapAPI, knowledgeSource, results);
}

async function extractViaItems(flatmapAPI, knowledgeSource, knowledge) {
  const results = [];
  knowledge.forEach((obj) => {
    if (!Array.isArray(obj.connectivity) || obj.connectivity.length === 0) return;
    const connectivityItems = new Set(getConnectivityItems(obj));
    [
      ...getPhenotypeItems(obj, 'ilxtr:hasAxonLeadingToSensorySubcellularElementIn'),
      ...getPhenotypeItems(obj, 'ilxtr:hasAxonLocatedIn'),
    ].forEach((item) => {
      const stringifyItem = JSON.stringify(item);
      if (connectivityItems.has(stringifyItem)) results.push(item);
    });
  });
  return await transformResults(flatmapAPI, knowledgeSource, results);
}

function findPathsByOriginItem(knowledge, originItems) {
  return knowledge.filter((obj) => {
    if (!Array.isArray(obj.connectivity) || obj.connectivity.length === 0) return false;
    const origins = getPhenotypeItems(obj, 'ilxtr:hasSomaLocatedIn');
    return origins.some((item) =>
      originItems.map((i) => JSON.stringify(i)).includes(JSON.stringify(item)),
    );
  });
}

function findPathsByDestinationItem(knowledge, destinationItems) {
  return knowledge.filter((obj) => {
    if (!Array.isArray(obj.connectivity) || obj.connectivity.length === 0) return false;
    const destinations = [
      ...getPhenotypeItems(obj, 'ilxtr:hasAxonPresynapticElementIn'),
      ...getPhenotypeItems(obj, 'ilxtr:hasAxonSensorySubcellularElementIn'),
    ];
    return destinations.some((item) =>
      destinationItems.map((i) => JSON.stringify(i)).includes(JSON.stringify(item)),
    );
  });
}

function findPathsByViaItem(knowledge, viaItems) {
  return knowledge.filter((obj) => {
    if (!Array.isArray(obj.connectivity) || obj.connectivity.length === 0) return false;
    const vias = [
      ...getPhenotypeItems(obj, 'ilxtr:hasAxonLeadingToSensorySubcellularElementIn'),
      ...getPhenotypeItems(obj, 'ilxtr:hasAxonLocatedIn'),
    ];
    return vias.some((item) =>
      viaItems.map((i) => JSON.stringify(i)).includes(JSON.stringify(item)),
    );
  });
}

async function queryPathsByRouteFromKnowledge({ knowledge, origins, destinations, vias }) {
  let results = knowledge;

  if (origins.length) {
    results = findPathsByOriginItem(results, origins);
  }
  if (destinations.length) {
    results = findPathsByDestinationItem(results, destinations);
  }
  if (vias.length) {
    results = findPathsByViaItem(results, vias);
  }

  return results;
}

async function getFlatmapFilterOptions(flatmapAPI, mapImp, providedKnowledge, providedPathways) {
  let filterOptions = [];
  const connectionFilters = [];

  if (mapImp) {
    // get flatmap filters
    if (mapImp && typeof mapImp.featureFilterRanges === 'function') {
      const filterRanges = mapImp.featureFilterRanges();
      for (const [key, value] of Object.entries(filterRanges)) {
        let main = {
          key: `flatmap.connectivity.${key}`,
          label: '',
          children: [],
        };
        let children = [];
        if (key === 'kind') {
          main.label = 'Pathways';
          for (const facet of value) {
            const pathway = providedPathways.find((path) => path.type === facet);
            if (pathway) {
              children.push({
                key: `${main.key}.${facet}`,
                label: pathway.label,
                colour: pathway.colour,
                colourStyle: 'line',
                dashed: pathway.dashed,
              });
            }
          }
        } else if (key === 'taxons') {
          main.label = 'Studied in';
          const entityLabels = await findTaxonomyLabels(mapImp, mapImp.taxonIdentifiers);
          if (entityLabels.length) {
            for (const facet of value) {
              const taxon = entityLabels.find((p) => p.taxon === facet);
              if (taxon) {
                children.push({
                  key: `${main.key}.${facet}`,
                  // space added at the end of label to make sure the display name will not be updated
                  // prevent sidebar searchfilter convertReadableLabel
                  label: `${taxon.label} `,
                });
              }
            }
          }
        } else if (key === 'alert') {
          main.label = 'Notes';
          for (const facet of ['with', 'without']) {
            children.push({
              key: `${main.key}.${facet}`,
              label: `${facet} notes`,
            });
          }
        }
        main.children = children.sort((a, b) => a.label.localeCompare(b.label));
        if (main.label && main.children.length) {
          filterOptions.push(main);
        }
      }
    }

    const mapKnowledge = mapImp.pathways.paths;
    const flatmapKnowledge = [];
    for (const knowledge of providedKnowledge) {
      const id = knowledge.id;
      if (id) {
        const mapKnowledgeObj = mapKnowledge[id];
        if (mapKnowledgeObj && mapKnowledgeObj.connectivity && mapKnowledgeObj['node-phenotypes']) {
          const mapConnectivity = mapKnowledgeObj.connectivity;
          const mapNodePhenotypes = mapKnowledgeObj['node-phenotypes'];

          // Create a new object with only the necessary properties to avoid mutation
          const filteredNodePhenotypes = {};
          for (let key in knowledge['node-phenotypes']) {
            if (mapNodePhenotypes[key]) {
              // take only map node-phenotypes
              filteredNodePhenotypes[key] = [...mapNodePhenotypes[key]];
            }
          }

          // Build new object with filtered data instead of deep cloning
          flatmapKnowledge.push({
            ...knowledge,
            connectivity: [...mapConnectivity],
            'node-phenotypes': filteredNodePhenotypes,
          });
        }
      }
    }

    const knowledgeSource = mapImp.knowledgeSource;
    const originItems = await extractOriginItems(flatmapAPI, knowledgeSource, flatmapKnowledge);
    const viaItems = await extractViaItems(flatmapAPI, knowledgeSource, flatmapKnowledge);
    const destinationItems = await extractDestinationItems(
      flatmapAPI,
      knowledgeSource,
      flatmapKnowledge,
    );

    const transformItem = (facet, item) => {
      const key = JSON.stringify(item.key);
      return {
        key: `flatmap.connectivity.source.${facet}.${key}`,
        label: item.label || key,
      };
    };

    for (const facet of ['origin', 'via', 'destination', 'all']) {
      let childrenList;
      if (facet === 'origin') {
        childrenList = originItems.map((item) => transformItem(facet, item));
      } else if (facet === 'via') {
        childrenList = viaItems.map((item) => transformItem(facet, item));
      } else if (facet === 'destination') {
        childrenList = destinationItems.map((item) => transformItem(facet, item));
      } else {
        // All is the combination of origin, via, destination
        const allList = [
          ...originItems.map((item) => transformItem(facet, item)),
          ...viaItems.map((item) => transformItem(facet, item)),
          ...destinationItems.map((item) => transformItem(facet, item)),
        ];
        // Generate unique list since the same feature can be in origin, via, and destination
        const seenKeys = new Set();
        childrenList = allList.filter((item) => {
          if (seenKeys.has(item.key)) return false;
          seenKeys.add(item.key);
          return true;
        });
      }

      // Those without label but key should be below
      childrenList = childrenList.sort((a, b) => {
        const isAlpha = (str) => /^[a-zA-Z]/.test(str);
        const aAlpha = isAlpha(a.label);
        const bAlpha = isAlpha(b.label);

        if (aAlpha && !bAlpha) return -1;
        if (!aAlpha && bAlpha) return 1;

        return a.label.localeCompare(b.label);
      });

      if (childrenList.length) {
        connectionFilters.push({
          key: `flatmap.connectivity.source.${facet}`,
          label: facet,
          children: childrenList,
        });
      }
    }

    if (connectionFilters.length) {
      filterOptions.push(...connectionFilters);
    }
  }
  return filterOptions;
}

export {
  filterOrigins,
  filterDestinations,
  filterViaLocations,
  extractOriginItems,
  extractDestinationItems,
  extractViaItems,
  findPathsByOriginItem,
  findPathsByDestinationItem,
  findPathsByViaItem,
  queryPathsByRouteFromKnowledge,
  fetchLabels,
  getFlatmapFilterOptions,
};

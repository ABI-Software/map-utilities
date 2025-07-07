// origins = ilxtr:hasSomaLocatedIn
// destinations = ilxtr:hasAxonPresynapticElementIn, ilxtr:hasAxonSensorySubcellularElementIn
// via = ilxtr:hasAxonLeadingToSensorySubcellularElementIn, ilxtr:hasAxonLocatedIn

async function query(flatmapAPI, sql, params) {
  const url = `${flatmapAPI}knowledge/query/`;
  const query = { sql, params };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Accept": "application/json; charset=utf-8",
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
}

async function fetchLabels(flatmapAPI, labelledTerms) {
  if (!labelledTerms.length) return [];

  const data = await query(
    flatmapAPI,
    `select entity, knowledge from knowledge
      where entity in (?${', ?'.repeat(labelledTerms.length - 1)})
      order by source desc`,
    [...labelledTerms]
  );

  return await data.values;
}

function filterOrigins(item) {
  const soma = item["node-phenotypes"]?.["ilxtr:hasSomaLocatedIn"];
  return Array.isArray(item.connectivity) &&
    item.connectivity.length > 0 &&
    Array.isArray(soma) &&
    soma.length > 0;
}

function filterDestinations(item) {
  const axonPresyn = item["node-phenotypes"]?.["ilxtr:hasAxonPresynapticElementIn"];
  const axonSensory = item["node-phenotypes"]?.["ilxtr:hasAxonSensorySubcellularElementIn"];
  const hasDest =
    (Array.isArray(axonPresyn) && axonPresyn.length > 0) ||
    (Array.isArray(axonSensory) && axonSensory.length > 0);
  return Array.isArray(item.connectivity) &&
    item.connectivity.length > 0 &&
    hasDest;
}

function filterViaLocations(item) {
  if (!Array.isArray(item.connectivity) || item.connectivity.length === 0) return false;

  const origins = new Set(
    (item["node-phenotypes"]?.["ilxtr:hasSomaLocatedIn"] || []).map(arr => arr[0])
  );
  const destinations = new Set([
    ...((item["node-phenotypes"]?.["ilxtr:hasAxonPresynapticElementIn"] || []).map(arr => arr[0])),
    ...((item["node-phenotypes"]?.["ilxtr:hasAxonSensorySubcellularElementIn"] || []).map(arr => arr[0]))
  ]);

  return item.connectivity.some(pair => {
    const [from, to] = pair;
    const fromId = from[0];
    const toId = to[0];
    return (
      !origins.has(fromId) &&
      !destinations.has(toId)
    );
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
  const arr = obj["node-phenotypes"]?.[prop];
  if (!Array.isArray(arr)) return [];
  return arr;
}

function transformResults(results) {
  return Array.from(
    new Map(results.map(item => [JSON.stringify(item), item])).values()
  ).map((item) => ({ key: item }));
}

async function extractOriginItems(flatmapAPI, knowledge) {
  const results = [];
  knowledge.forEach(obj => {
    if (!Array.isArray(obj.connectivity) || obj.connectivity.length === 0) return;
    const connectivityItems = new Set(getConnectivityItems(obj));
    getPhenotypeItems(obj, "ilxtr:hasSomaLocatedIn").forEach((item) => {
      const stringifyItem = JSON.stringify(item);
      if (connectivityItems.has(stringifyItem)) results.push(item);
    });
  });
  return transformResults(results);
}

async function extractDestinationItems(flatmapAPI, knowledge) {
  const results = [];
  knowledge.forEach(obj => {
    if (!Array.isArray(obj.connectivity) || obj.connectivity.length === 0) return;
    const connectivityItems = new Set(getConnectivityItems(obj));
    [
      ...getPhenotypeItems(obj, "ilxtr:hasAxonPresynapticElementIn"),
      ...getPhenotypeItems(obj, "ilxtr:hasAxonSensorySubcellularElementIn")
    ].forEach(item => {
      const stringifyItem = JSON.stringify(item);
      if (connectivityItems.has(stringifyItem)) results.push(item);
    });
  });
  return transformResults(results);
}

async function extractViaItems(flatmapAPI, knowledge) {
  const results = [];
  knowledge.forEach(obj => {
    if (!Array.isArray(obj.connectivity) || obj.connectivity.length === 0) return;
    const connectivityItems = new Set(getConnectivityItems(obj));
    [
      ...getPhenotypeItems(obj, "ilxtr:hasAxonLeadingToSensorySubcellularElementIn"),
      ...getPhenotypeItems(obj, "ilxtr:hasAxonLocatedIn")
    ].forEach(item => {
      const stringifyItem = JSON.stringify(item);
      if (connectivityItems.has(stringifyItem)) results.push(item);
    });
  });
  return transformResults(results);
}

function findPathsByOriginItem(knowledge, originItems) {
  return knowledge.filter(obj => {
    if (!Array.isArray(obj.connectivity) || obj.connectivity.length === 0) return false;
    const origins = getPhenotypeItems(obj, "ilxtr:hasSomaLocatedIn");
    return origins.some(item => originItems.map(i => JSON.stringify(i)).includes(JSON.stringify(item)));
  });
}

function findPathsByDestinationItem(knowledge, destinationItems) {
  return knowledge.filter(obj => {
    if (!Array.isArray(obj.connectivity) || obj.connectivity.length === 0) return false;
    const destinations = [
      ...getPhenotypeItems(obj, "ilxtr:hasAxonPresynapticElementIn"),
      ...getPhenotypeItems(obj, "ilxtr:hasAxonSensorySubcellularElementIn")
    ];
    return destinations.some(item => destinationItems.map(i => JSON.stringify(i)).includes(JSON.stringify(item)));
  });
}

function findPathsByViaItem(knowledge, viaItems) {
  return knowledge.filter(obj => {
    if (!Array.isArray(obj.connectivity) || obj.connectivity.length === 0) return false;
    const vias = [
      ...getPhenotypeItems(obj, "ilxtr:hasAxonLeadingToSensorySubcellularElementIn"),
      ...getPhenotypeItems(obj, "ilxtr:hasAxonLocatedIn")
    ];
    return vias.some(item => viaItems.map(i => JSON.stringify(i)).includes(JSON.stringify(item)));
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
}

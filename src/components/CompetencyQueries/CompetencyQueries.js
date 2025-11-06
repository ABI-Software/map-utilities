/**
 * @private
 * Competency Queries
 *
 * competencyQuery: base function
 * query[functionName]: specific queries
 *
 * Note: use named-export for better tree-shaking.
 */
async function _postRequest(API_URL, payload) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Request failed:", error);
    throw error;
  }
}

/**
 * Competency Query
 * @public
 * @param {Object} options - Query options.
 * @param {string} options.flatmapAPI - Base URL of the flatmap server.
 * @param {string} options.knowledgeSource - SCKAN source ID.
 * @param {string} options.queryId - Competency query ID.
 * @param {Array} options.parameters - Parameters specific to the query.
 * @param {string} [options.orderId] - Optional order ID for sorting.
 * @returns {Promise<any>} - JSON response.
 */
async function competencyQuery(options) {
  const { flatmapAPI, knowledgeSource, queryId, parameters, orderId } = options;
  const API_URL = `${flatmapAPI}competency/query`;

  const params = Array.isArray(parameters) ? [...parameters] : [];

  params.push({
    "column": "source_id",
    "value": knowledgeSource,
  });

  let queryIdStr;
  if (typeof queryId === 'number') {
    queryIdStr = queryId.toString();
  } else if (typeof queryId === 'string') {
    queryIdStr = queryId;
  } else {
    throw new TypeError('queryId must be a string or a number convertible to string.');
  }

  const payload = {
    "query_id": queryIdStr,
    "parameters": params,
  };

  // Currently only query 12 has an order parameter
  if (orderId) {
    payload.order = [orderId];
  }

  return _postRequest(API_URL, payload);
}

/**
 * @public
 * @param {*} flatmapAPI
 * @param {*} knowledgeSource
 * @param {*} featureId
 * @returns
 */
// Neuron populations associated with a location [query id => 1] (or)
// Neuron populations that share at least one edge with another neuron population [query id => 23]
async function queryAllConnectedPaths(flatmapAPI, knowledgeSource, featureId) {
  const featureIds = Array.isArray(featureId) ? featureId : [featureId];
  // Split into paths (ilxtr:) and features (non-ilxtr:)
  const pathIds = featureIds.filter(id => id.startsWith('ilxtr:'));
  const locationIds = featureIds.filter(id => !id.startsWith('ilxtr:'));

  const promises = [];

  // Query for path IDs (query 23)
  if (pathIds.length > 0) {
    promises.push(
      competencyQuery({
        flatmapAPI: flatmapAPI,
        knowledgeSource: knowledgeSource,
        queryId: 23,
        parameters: [
          {
            column: 'path_id',
            value: pathIds
          },
        ]
      })
    );
  }

  // Query for feature/location IDs (query 1)
  if (locationIds.length > 0) {
    promises.push(
      competencyQuery({
        flatmapAPI: flatmapAPI,
        knowledgeSource: knowledgeSource,
        queryId: 1,
        parameters: [
          {
            column: 'feature_id',
            value: locationIds
          },
        ]
      })
    );
  }

  // Execute queries in parallel
  const results = await Promise.all(promises);

  // Combine all paths from both queries
  let allPaths = [...pathIds]; // Include original path IDs

  results.forEach((data) => {
    // value => [ 'source_id', 'path_id', 'axon_terminal']
    const paths = data?.results?.values?.map(value => value[1]) || [];
    allPaths.push(...paths);
  });

  const combined = [...new Set(allPaths)];

  // Continue to forward and backward connections
  let additionalPaths = [];
  if (combined.length) {
    additionalPaths = await queryForwardBackwardConnections(flatmapAPI, knowledgeSource, combined);
  }
  const total = [...new Set([...combined, ...additionalPaths])];

  return total;
}

/**
 * @public
 * @param {*} flatmapAPI
 * @param {*} knowledgeSource
 * @param {*} featureId
 * @returns
 */
// Neuron populations beginning at a location
async function queryPathsByOrigin(flatmapAPI, knowledgeSource, featureId) {
  const data = await competencyQuery({
    flatmapAPI: flatmapAPI,
    knowledgeSource: knowledgeSource,
    queryId: 1, // TODO: to update to a specific query ID for origins
    parameters: [
      {
        column: 'feature_id',
        value: featureId
      },
    ]
  });
  if (data?.results?.values) {
    const paths = data.results.values.map((value) => {
      // value => [ 'source_id', 'path_id', 'axon_terminal']
      return value[1];
    });
    // remove duplicates
    return [...new Set(paths)];
  }
  return [];
}

/**
 * @public
 * @param {*} flatmapAPI
 * @param {*} knowledgeSource
 * @param {*} featureId
 * @returns
 */
// Neuron populations via a location
async function queryPathsByViaLocation(flatmapAPI, knowledgeSource, featureId) {
  const data = await competencyQuery({
    flatmapAPI: flatmapAPI,
    knowledgeSource: knowledgeSource,
    queryId: 1, // TODO: to update to a specific query ID for via
    parameters: [
      {
        column: 'feature_id',
        value: featureId
      },
    ]
  });
  if (data?.results?.values) {
    const paths = data.results.values.map((value) => {
      // value => [ 'source_id', 'path_id', 'axon_terminal']
      return value[1];
    });
    // remove duplicates
    return [...new Set(paths)];
  }
  return [];
}

/**
 * @public
 * @param {*} flatmapAPI
 * @param {*} knowledgeSource
 * @param {*} featureId
 * @returns
 */
// Neuron populations terminating at a location
async function queryPathsByDestination(flatmapAPI, knowledgeSource, featureId) {
  const data = await competencyQuery({
    flatmapAPI: flatmapAPI,
    knowledgeSource: knowledgeSource,
    queryId: 2,
    parameters: [
      {
        column: 'feature_id',
        value: featureId
      },
    ]
  });
  if (data?.results?.values) {
    const paths = data.results.values.map((value) => {
      // value => [ 'source_id', 'path_id', 'axon_terminal']
      return value[1];
    });
    // remove duplicates
    return [...new Set(paths)];
  }
  return [];
}

/**
 * @private
 * @param {*} inputArray
 * @returns
 */
function _extractFeatureIds(inputArray) {
  const result = [];

  for (const itemString of inputArray) {
    const item = JSON.parse(itemString);

    if (Array.isArray(item) && item.length >= 2) {
      if (Array.isArray(item[1]) && item[1].length === 0) {
        result.push(item[0]);
      }
    }
  }
  return result;
}

/**
 * @public
 * @param {*} flatmapAPI
 * @param {*} knowledgeSource
 * @param {*} pathIds
 * @returns
 */
// Neuron populations as forward or backward connections of a neuron population
async function queryForwardBackwardConnections(flatmapAPI, knowledgeSource, pathIds) {
  const data = await competencyQuery({
    flatmapAPI,
    knowledgeSource,
    queryId: 26,
    parameters: [
      {
        column: 'path_id',
        value: pathIds
      },
    ]
  });
  if (data?.results?.values) {
    const paths = data.results.values.map((value) => {
      // value => ["source_id", "base_path_id", "dest_path_id", "distance"]
      // return dest_path_id
      return value[2];
    });
    // remove duplicates
    return [...new Set(paths)];
  }
  return [];
}

/**
 * @public
 * @param {*} options
 * @returns
 */
// Neuron populations from origin to destination, via
// Query 24: Neuron populations that have source, via, and destination nodes
// Query 25: Neuron populations that have source, via, and destination locations
async function queryPathsByRoute({ flatmapAPI, knowledgeSource, origins, destinations, vias }) {
  const originFeatureIds = _extractFeatureIds(origins);
  const destinationFeatureIds = _extractFeatureIds(destinations);
  const viaFeatureIds = _extractFeatureIds(vias);

  const paramsF = [
    {
      column: 'source_feature_id',
      value: originFeatureIds,
    },
    {
      column: 'via_feature_id',
      value: viaFeatureIds,
    },
    {
      column: 'dest_feature_id',
      value: destinationFeatureIds,
    }
  ];

  const params = [
    {
      column: 'source_node_id',
      value: origins,
    },
    {
      column: 'via_node_id',
      value: vias,
    },
    {
      column: 'dest_node_id',
      value: destinations,
    }
  ];

  const shouldCallDataF = paramsF.some(param =>
    Array.isArray(param.value) && param.value.length > 0);

  const promises = [
    competencyQuery({
      flatmapAPI,
      knowledgeSource,
      queryId: 24,
      parameters: params
    })
  ];

  if (shouldCallDataF) {
    promises.push(
      competencyQuery({
        flatmapAPI,
        knowledgeSource,
        queryId: 25,
        parameters: paramsF
      })
    );
  }

  const results = await Promise.all(promises);

  let pathsF = [];
  let data;
  if (shouldCallDataF) {
    const dataF = results[0];
    data = results[1];
    // value => [ 'source_id', 'path_id', 'axon_terminal']
    pathsF = dataF?.results?.values?.map(value => value[1]) || [];
  } else {
    data = results[0];
  }
  // value => [ 'source_id', 'path_id', 'axon_terminal']
  const paths = data?.results?.values?.map(value => value[1]) || [];
  const combined = [...new Set([...pathsF, ...paths])];

  // Continue to forward and backward connections
  let additionalPaths = [];
  if (combined.length) {
    additionalPaths = await queryForwardBackwardConnections(flatmapAPI, knowledgeSource, combined);
  }
  const total = [...new Set([...combined, ...additionalPaths])];

  return total;
}

export {
  competencyQuery,
  queryAllConnectedPaths,
  queryPathsByOrigin,
  queryPathsByViaLocation,
  queryPathsByDestination,
  queryPathsByRoute,
  queryForwardBackwardConnections,
};

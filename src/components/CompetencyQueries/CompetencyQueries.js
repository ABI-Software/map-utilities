/**
 * Competency Query
 *
 * @param {Object} options - Query options.
 * @param {string} options.flatmapServer - Base URL of the flatmap server.
 * @param {string} options.sourceId - SCKAN source ID.
 * @param {string} options.queryId - Competency query ID.
 * @param {Array} options.parameters - Parameters specific to the query.
 * @param {string} [options.orderId] - Optional order ID for sorting.
 * @returns {Promise<any>} - JSON response.
 */

async function postRequest(API_URL, payload) {
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

export async function competencyQuery(options) {
  const { flatmapServer, sourceId, queryId, parameters, orderId } = options;
  const API_URL = `${flatmapServer}competency/query`;

  const params = Array.isArray(parameters) ? [...parameters] : [];

  params.push({
    "column": "source_id",
    "value": sourceId,
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

  return postRequest(API_URL, payload);
}

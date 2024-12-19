const capitalise = term => {
  if (term)
    return term.charAt(0).toUpperCase() + term.slice(1);
  return term;
};

const convertNodeToObject = (node) => {
  const obj = {};

  if (node.attributes) {
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      obj[`@${attr.nodeName}`] = attr.nodeValue;
    }
  }

  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === Node.ELEMENT_NODE) {
      const childResult = convertNodeToObject(child);
      if (obj[child.nodeName]) {
        if (!Array.isArray(obj[child.nodeName])) {
          obj[child.nodeName] = [obj[child.nodeName]];
        }
        obj[child.nodeName].push(childResult);
      } else {
        obj[child.nodeName] = childResult;
      }
    } else if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim() !== '') {
      return child.nodeValue.trim();
    }
  }

  return obj;
};

const xmlToJSON = (xmlText) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  const result = {};
  result[xmlDoc.documentElement.nodeName] = convertNodeToObject(xmlDoc.documentElement);

  return result;
};

export {
  capitalise,
  xmlToJSON,
};

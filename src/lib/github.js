/**
 * @param {string} host
 * @param {string} link
 *
 * @returns {{org: string, repo: string, pr: string}} result
 */
export function parseGithubLink(host, link) {
  const result = { org: "", repo: "", pr: "" };

  const baseUrl = `https://${host}/`;
  if (!link.startsWith(baseUrl)) {
    throw new Error(`Unknown github / github enterprise host '${host}'`);
  }

  // Remove the base URL to extract the path
  const path = link.replace(baseUrl, "").split("/");

  // expected format <org>/<repo>/pull/<pr>
  if (path.length >= 2) {
    result.org = path[0];
    result.repo = path[1];
  }

  // extract pr number
  if (path.length >= 4 && path[2] === "pull") {
    result.pr = path[3];
  }

  return result;
}

/**
 *
 * @param {string} host
 * @param {string} link
 * @returns {boolean}
 */
export function isPRLink(host, link) {
  const pattern = new RegExp(`^https://${host.replace(/\./g, "\\.")}/[^/]+/[^/]+/pull/\\d+`);

  return pattern.test(link);
}

/**
 * @param {string[]} hosts
 * @param {string} link
 *
 * @returns {{org: string, repo: string, pr: string}} result
 */
export function parsePRLink(hosts, link) {
  const result = { org: "", repo: "", pr: "" };

  let ok = false;
  let path;
  for (const host of hosts) {
    const baseUrl = `https://${host}/`;
    if (link.startsWith(baseUrl)) {
      ok = true;
      path = link.replace(baseUrl, "").split("/");
    }
  }

  if (!ok) {
    throw new Error(`'${link}' has an unrecognized host, maybe it needs to be added?`);
  }

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
 * @param {string} link
 * @returns {boolean}
 */
export function isPRLink(link) {
  const pattern = new RegExp(`^https://.+/[^/]+/[^/]+/pull/\\d+`);

  return pattern.test(link);
}

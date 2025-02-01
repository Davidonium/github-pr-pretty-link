<script>
  import browser from "webextension-polyfill";

  let githubInstanceHost = $state("github.com");
  let copyDisabled = $state(true);

  $effect(async () => {
    const { host } = await browser.storage.local.get("host");
    if (host) {
      githubInstanceHost = host;
    }

    const tab = await activeTab();
    const url = new URL(tab.url);

    console.log("current tab host", url.hostname, "current stored host", host);
    copyDisabled = url.hostname !== host;
    console.log("copy disabled", copyDisabled);
  });

  async function copy() {
    const tab = await activeTab();

    let result;
    try {
      result = (
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: scrapeTitle,
        })
      )[0].result;
    } catch (err) {
      console.error("Error executing script to retrieve title:", err);
      throw err;
    }

    const title = result.title;
    const { org, repo, pr } = parseGithubLink(githubInstanceHost, tab.url);

    const link = `${org}/${repo}#${pr}`;

    try {
      await navigator.clipboard.writeText(`[${link}](${tab.url}) - ${title}`);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  /**
   * @param {string} host
   * @param {string} link
   *
   * @returns {{org: string, repo: string, pr: string}} result
   */
  function parseGithubLink(host, link) {
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

  function scrapeTitle() {
    return {
      title: document.querySelector("h1.gh-header-title .js-issue-title")
        .textContent,
    };
  }

  async function onHostChange(ev) {
    await browser.storage.local.set({
      host: githubInstanceHost,
    });
  }

  async function activeTab() {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tabs.length != 1) {
      console.error("failed to retrieve active tab");
      return;
    }

    return tabs[0];
  }
</script>

<main>
  <button type="button" onclick={copy}>Copy Pretty Anchor</button>
  <input
    type="text"
    disabled={copyDisabled}
    bind:value={githubInstanceHost}
    onchange={onHostChange}
  />
</main>

<style>
</style>

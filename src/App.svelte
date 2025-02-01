<script>
  import browser from "webextension-polyfill";
  import { parseGithubLink, isPRLink } from "./lib/github";

  let githubInstanceHost = $state("github.com");
  let copyDisabled = $state(true);
  let btnText = $state("Copy");
  let copiedTimeout;

  $effect(async () => {
    const { host } = await browser.storage.local.get("host");
    if (host) {
      githubInstanceHost = host;
    }

    const tab = await activeTab();
    const url = new URL(tab.url);

    copyDisabled = !isPRLink(host, url);
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

    const display = `${org}/${repo}#${pr}`;

    const md = `[${display}](${tab.url}) - ${title}`;
    const el = document.createElement("a");
    el.href = tab.url;
    el.textContent = display;

    const html = el.outerHTML + ` - ${title}`;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([md], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
    } catch (err) {
      throw new Error("Failed to copy to the clipboard", { cause: err });
    }

    btnText = "Copied!";
    if (copiedTimeout) {
      clearTimeout(copiedTimeout);
    }
    copiedTimeout = setTimeout(() => {
      btnText = "Copy";
    }, 2000);
  }

  /**
   * @return {{title: string}}
   */
  function scrapeTitle() {
    return {
      title: document.querySelector("h1.gh-header-title .js-issue-title").textContent,
    };
  }

  async function onHostChange(ev) {
    await browser.storage.local.set({
      host: githubInstanceHost,
    });
  }

  /**
   * @returns {Promise<browser.Tabs.Tab>}
   */
  async function activeTab() {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tabs.length != 1) {
      throw new Error("could not retrieve active tab");
    }

    return tabs[0];
  }
</script>

<div class="container">
  <div class="btn-container">
    {#if copyDisabled}
      <div class="disabled-disclaimer">You must be in a github pull request page to copy a cool link!</div>
    {/if}
    <button class="copy-btn" type="button" disabled={copyDisabled} onclick={copy}>{btnText}</button>
  </div>
  <div class="config">
    <label>
      Github Host:
      <input type="text" bind:value={githubInstanceHost} onchange={onHostChange} />
    </label>
  </div>
</div>

<style>
  .copy-btn {
    background-color: #f2f2f2;
    border: 2px solid #282c34;
    border-radius: 15px;
    box-shadow: #282c34 4px 4px 0 0;
    color: #282c34;
    cursor: pointer;
    display: inline-block;
    width: 100%;
    font-weight: 600;
    font-size: 18px;
    line-height: 50px;
    text-align: center;
    text-decoration: none;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
  }

  .copy-btn:hover:enabled {
    background-color: #fff;
  }

  .copy-btn:active:enabled {
    box-shadow: #282c34 2px 2px 0 0;
    transform: translate(2px, 2px);
  }

  .copy-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    pointer-events: none;
  }

  .config {
    /* position: absolute;
    top: 100%;
    left: 0; */
    margin-top: 1rem;
  }

  .disabled-disclaimer {
    padding-bottom: 0.5rem;
  }
</style>

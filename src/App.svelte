<script>
  import browser from "webextension-polyfill";
  import { parseGithubLink, isPRLink } from "./lib/github";
  import Cog from "./lib/icons/Cog.svelte";
  import Close from "./lib/icons/Close.svelte";

  let githubInstanceHost = $state("github.com");
  let copyDisabled = $state(true);
  let btnText = $state("Copy");
  let configVisible = $state(false);
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

  async function onHostChange() {
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
  <div class="copy-btn-container">
    <button class="copy-btn" type="button" disabled={copyDisabled} onclick={copy}>{btnText}</button>
  </div>
  {#if copyDisabled}
    <div class="disabled-disclaimer">You must be in a github pull request page to copy a cool link!</div>
  {/if}
  <div class="config-bar">
    <button class="config-toggle" type="button" onclick={() => (configVisible = true)}>
      <Cog />
    </button>
  </div>
  {#if configVisible}
    <div class="config-container">
      <button class="config-close" type="button" onclick={() => (configVisible = false)}><Close /></button>
      <label>
        Github Host:
        <input type="text" bind:value={githubInstanceHost} onchange={onHostChange} />
      </label>
    </div>
  {/if}
</div>

<style>
  /* box-shadow fix on copy-btn */
  .copy-btn-container {
    padding-right: 4px;
    padding-bottom: 4px;
  }

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

  .disabled-disclaimer {
    margin-top: 0.3rem;
  }

  .config-bar {
    display: flex;
    justify-content: right;
    margin-top: 0.3rem;
  }

  .config-toggle {
    width: 30px;
    height: 30px;
    cursor: pointer;
  }

  .config-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    min-height: 100%;
    background-color: white;
  }

  .config-close {
    position: absolute;
    top: 0;
    right: 0;
    width: 30px;
    height: 30px;
  }
</style>

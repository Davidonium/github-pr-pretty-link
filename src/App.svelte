<script>
  import browser from "webextension-polyfill";
  import { isPRLink, parsePRLink } from "./lib/github";
  import Cog from "./lib/icons/Cog.svelte";
  import Close from "./lib/icons/Close.svelte";
  import Trash from "./lib/icons/Trash.svelte";

  let copyEnabled = $state(false);
  let btnText = $state("Copy");
  let configVisible = $state(false);
  let enterpriseHosts = $state([]);
  let copiedTimeout;

  $effect(async () => {
    const entry = await browser.storage.local.get("enterpriseHosts");

    enterpriseHosts = JSON.parse(entry.enterpriseHosts) || [];
    console.log(enterpriseHosts.length);

    const tab = await activeTab();
    const url = new URL(tab.url);

    const hasPRLink = [{ value: "github.com" }, ...enterpriseHosts].some(
      (host) => url.hostname === host.value && isPRLink(url),
    );

    copyEnabled = hasPRLink;
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

    const hosts = [{ value: "github.com" }, ...enterpriseHosts].map((h) => h.value);
    const { org, repo, pr } = parsePRLink(hosts, tab.url);

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

  async function onHostChange() {
    await saveHosts();
  }

  function addHost() {
    console.log("adding host");
    enterpriseHosts.push({
      value: "",
    });
  }

  function removeHost(host) {
    enterpriseHosts = enterpriseHosts.filter((h) => h.value !== host.value);
    console.log("newlength", enterpriseHosts.length);
    saveHosts();
  }

  async function saveHosts() {
    await browser.storage.local.set({
      enterpriseHosts: JSON.stringify(enterpriseHosts),
    });
  }
</script>

<div class="container">
  <div class="copy-btn-container">
    <button class="copy-btn" type="button" disabled={!copyEnabled} onclick={copy}>{btnText}</button>
  </div>
  {#if !copyEnabled}
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
      <span class="config-hosts">Enterprise Hosts</span>
      <button type="button" onclick={addHost}>Add</button>
      <div class="host-list">
        {#each enterpriseHosts as host, i}
          <div class="host-input-group">
            <input name={`host-value-${i}`} type="text" bind:value={host.value} onchange={onHostChange} />
            <button class="trash-btn" onclick={() => removeHost(host)} type="button"><Trash /></button>
          </div>
        {:else}
          <span>Github Enterprise hosts can be added here.</span>
        {/each}
      </div>
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
    padding: 0.4rem;
    background-color: white;
  }

  .config-close {
    position: absolute;
    top: 0;
    right: 0;
    width: 30px;
    height: 30px;
  }

  .trash-btn {
    width: 15px;
    height: 15px;
  }

  .config-hosts {
    font-weight: 600;
    font-size: 16px;
  }

  .host-list {
    margin-top: 0.4rem;
  }

  .host-input-group {
    display: flex;
    align-items: center;
    gap: 0.2rem;
  }
</style>

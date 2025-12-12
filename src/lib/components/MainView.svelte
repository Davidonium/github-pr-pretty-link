<script>
  import browser from "webextension-polyfill";
  import { appState } from "$lib/state.svelte.js";
  import { generateClipboardContent } from "$lib/template";
  import { isPRLink, parsePRLink } from "$lib/github";
  import { isObject, isString } from "$lib/util/typecheck";
  import { Cog } from "$lib/icons";

  let copyEnabled = $state(false);
  let btnText = $state("Copy");
  let copiedTimeout = null;

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

  function scrapeTitle() {
    return {
      title: document.querySelector("h1.gh-header-title .js-issue-title").textContent,
    };
  }

  async function initialize() {
    const tab = await activeTab();
    const url = new URL(tab.url);

    const hosts = [{ value: "github.com" }, ...appState.enterpriseHosts];
    const hasPRLink = hosts.some((host) => url.hostname === host.value && isPRLink(url.toString()));

    copyEnabled = hasPRLink;

    if (hasPRLink) {
      const result = (
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: scrapeTitle,
        })
      )?.[0]?.result;

      if (result && isObject(result) && isString(result.title)) {
        const { org, repo, pr } = parsePRLink(
          hosts.map((h) => h.value),
          tab.url,
        );
        appState.currentPageContext = {
          org,
          repo,
          pr,
          title: result.title,
          url: tab.url,
          display: `${org}/${repo}#${pr}`,
        };
      }
    }
  }

  async function copy() {
    const tab = await activeTab();

    let result;
    try {
      result = (
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: scrapeTitle,
        })
      )[0]?.result;
    } catch (err) {
      console.error("Error executing script to retrieve title:", err);
      throw err;
    }

    if (!result || !isObject(result) || !("title" in result) || !isString(result.title)) {
      throw new Error("Script execution could not retrieve the title from the current active tab");
    }

    const title = result.title;

    const hosts = [{ value: "github.com" }, ...appState.enterpriseHosts].map((h) => h.value);
    const { org, repo, pr } = parsePRLink(hosts, tab.url);

    const display = `${org}/${repo}#${pr}`;

    if (!appState.activeTemplate) {
      throw new Error("No template available");
    }

    const variables = {
      org,
      repo,
      pr,
      title,
      url: tab.url,
      display,
    };

    const { plain, html } = generateClipboardContent(appState.activeTemplate.template, variables);

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }),
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

  initialize();
</script>

<div class="copy-btn-container">
  <button class="copy-btn" type="button" disabled={!copyEnabled} onclick={() => copy()}>{btnText}</button>
</div>
{#if !copyEnabled}
  <div class="disabled-disclaimer">You must be in a github pull request page to copy a cool link!</div>
{/if}
{#if copyEnabled && appState.currentPageContext && appState.activeTemplate}
  {#key appState.activeTemplate.id}
    <div class="main-preview">
      <strong>Preview:</strong>
      <div class="main-preview-content">
        {@html generateClipboardContent(appState.activeTemplate.template, appState.currentPageContext).html}
      </div>
    </div>
  {/key}
{/if}
<div class="config-bar">
  <button class="config-toggle" type="button" onclick={() => (appState.configVisible = true)}>
    <Cog />
  </button>
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

  .main-preview {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 13px;
  }

  .main-preview strong {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 12px;
    color: #666;
  }

  .main-preview-content {
    word-wrap: break-word;
    overflow-wrap: break-word;
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
</style>

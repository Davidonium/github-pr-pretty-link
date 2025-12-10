<script>
  import browser from "webextension-polyfill";
  import { isPRLink, parsePRLink } from "$lib/github";
  import { delay } from "$lib/util/delay";
  import { Cog, Close, Trash, Check } from "$lib/icons";
  import { isObject, isString } from "$lib/util/typecheck";
  import {
    generateClipboardContent,
    getDefaultTemplate,
    generateTemplateId,
    validateTemplate,
    MAX_TEMPLATES,
  } from "$lib/template";
  import { markdownLinksToHtml } from "$lib/markdown";

  let copyEnabled = $state(false);
  let btnText = $state("Copy");
  let configVisible = $state(false);
  let enterpriseHosts = $state([]);
  let templates = $state([]);
  let editingTemplate = $state(null);
  let previewData = $state(null);
  let confirmDelete = $state(null);
  let htmlManuallyEdited = $state(false);
  let copiedTimeout;

  let activeTemplate = $derived(templates.find((t) => t.isActive) || templates[0]);

  $effect(() => {
    (async function () {
      const entry = await browser.storage.local.get(["enterpriseHosts", "templates"]);

      if (isString(entry.enterpriseHosts)) {
        enterpriseHosts = JSON.parse(entry.enterpriseHosts);
      }

      if (isString(entry.templates)) {
        templates = JSON.parse(entry.templates);
      } else if (!entry.templates) {
        templates = [getDefaultTemplate()];
        await browser.storage.local.set({
          templates: JSON.stringify(templates),
        });
      }

      const tab = await activeTab();
      const url = new URL(tab.url);

      const hosts = [{ value: "github.com" }, ...enterpriseHosts];
      const hasPRLink = hosts.some((host) => url.hostname === host.value && isPRLink(url.toString()));

      copyEnabled = hasPRLink;

      // Build preview data if on PR page
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
          previewData = {
            org,
            repo,
            pr,
            title: result.title,
            url: tab.url,
            display: `${org}/${repo}#${pr}`,
          };
        }
      }
    })();
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
      )[0]?.result;
    } catch (err) {
      console.error("Error executing script to retrieve title:", err);
      throw err;
    }

    if (!result || !isObject(result) || !("title" in result) || !isString(result.title)) {
      throw new Error("Script execution could not retrieve the title from the current active tab");
    }

    const title = result.title;

    const hosts = [{ value: "github.com" }, ...enterpriseHosts].map((h) => h.value);
    const { org, repo, pr } = parsePRLink(hosts, tab.url);

    const display = `${org}/${repo}#${pr}`;

    // Get active template
    if (!activeTemplate) {
      throw new Error("No template available");
    }

    // Build variables
    const variables = {
      org,
      repo,
      pr,
      title,
      url: tab.url,
      display,
    };

    // Generate clipboard content from template
    const { plain, html } = generateClipboardContent(activeTemplate.template, variables);

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

  async function onFormChange(ev) {
    ev.preventDefault();
    await saveHosts();
  }

  const onKeyUp = delay(async () => {
    await saveHosts();
  }, 100);

  function addHost() {
    enterpriseHosts.push({
      value: "",
    });
  }

  function removeHost(host) {
    enterpriseHosts = enterpriseHosts.filter((h) => h.value !== host.value);
    saveHosts();
  }

  async function saveHosts() {
    await browser.storage.local.set({
      enterpriseHosts: JSON.stringify(enterpriseHosts),
    });
  }

  /**
   * Adds a new template to the list
   */
  function addTemplate() {
    if (templates.length >= MAX_TEMPLATES) {
      return;
    }

    const plainTemplate = "[${" + "display}](${" + "url}) - ${" + "title}";
    const newTemplate = {
      id: generateTemplateId(),
      name: `Template ${templates.length + 1}`,
      template: {
        plain: plainTemplate,
        html: markdownLinksToHtml(plainTemplate),
      },
      isActive: false,
    };
    editingTemplate = newTemplate;
    htmlManuallyEdited = false;
  }

  /**
   * Starts editing an existing template
   * @param {{id: string, name: string, template: {plain: string, html: string}, isActive: boolean}} template
   */
  function startEditTemplate(template) {
    editingTemplate = { ...template, template: { ...template.template } };
    htmlManuallyEdited = false;
  }

  /**
   * Cancels template editing
   */
  function cancelEditTemplate() {
    editingTemplate = null;
    htmlManuallyEdited = false;
  }

  /**
   * Handler for plain template changes - auto-generates HTML unless manually edited
   */
  function onPlainTemplateChange() {
    if (editingTemplate && !htmlManuallyEdited) {
      editingTemplate.template.html = markdownLinksToHtml(editingTemplate.template.plain);
    }
  }

  /**
   * Handler for HTML template changes - marks as manually edited
   */
  function onHtmlTemplateChange() {
    // If user clears the HTML field, re-enable auto-sync
    if (editingTemplate && (!editingTemplate.template.html || editingTemplate.template.html.trim() === "")) {
      htmlManuallyEdited = false;
      editingTemplate.template.html = markdownLinksToHtml(editingTemplate.template.plain);
    } else {
      htmlManuallyEdited = true;
    }
  }

  /**
   * Resets HTML to auto-generate from plain template
   */
  function resetHtmlSync() {
    if (editingTemplate) {
      htmlManuallyEdited = false;
      editingTemplate.template.html = markdownLinksToHtml(editingTemplate.template.plain);
    }
  }

  /**
   * Saves the currently editing template
   * @returns {Promise<void>}
   */
  async function saveTemplate() {
    if (!editingTemplate) return;

    const validation = validateTemplate(editingTemplate.template);
    if (!validation.valid) {
      alert("Template validation failed:\n" + validation.errors.join("\n"));
      return;
    }

    if (!editingTemplate.name || editingTemplate.name.trim() === "") {
      alert("Template name is required");
      return;
    }

    const existingIndex = templates.findIndex((t) => t.id === editingTemplate.id);
    if (existingIndex >= 0) {
      templates[existingIndex] = editingTemplate;
    } else {
      templates = [...templates, editingTemplate];
    }

    await browser.storage.local.set({
      templates: JSON.stringify(templates),
    });

    editingTemplate = null;
    htmlManuallyEdited = false;
  }

  /**
   * Deletes a template
   * @param {{id: string, name: string, template: {plain: string, html: string}, isActive: boolean}} template
   * @returns {Promise<void>}
   */
  async function deleteTemplate(template) {
    if (template.id === "default") {
      return;
    }

    confirmDelete = template;
  }

  /**
   * Confirms and executes template deletion
   * @returns {Promise<void>}
   */
  async function confirmDeleteTemplate() {
    if (!confirmDelete) return;

    templates = templates.filter((t) => t.id !== confirmDelete.id);

    // If we deleted the active template, make the first one active
    if (confirmDelete.isActive && templates.length > 0) {
      templates[0].isActive = true;
    }

    await browser.storage.local.set({
      templates: JSON.stringify(templates),
    });

    confirmDelete = null;
  }

  /**
   * Cancels template deletion
   */
  function cancelDeleteTemplate() {
    confirmDelete = null;
  }

  /**
   * Sets the active template
   * @param {{id: string, name: string, template: {plain: string, html: string}, isActive: boolean}} template
   * @returns {Promise<void>}
   */
  async function setActiveTemplate(template) {
    templates = templates.map((t) => ({
      ...t,
      isActive: t.id === template.id,
    }));

    await browser.storage.local.set({
      templates: JSON.stringify(templates),
    });
  }
</script>

<div class="container">
  {#if !configVisible}
    <div class="copy-btn-container">
      <button class="copy-btn" type="button" disabled={!copyEnabled} onclick={copy}>{btnText}</button>
    </div>
    {#if !copyEnabled}
      <div class="disabled-disclaimer">You must be in a github pull request page to copy a cool link!</div>
    {/if}
    {#if copyEnabled && previewData && activeTemplate}
      {#key activeTemplate.id}
        <div class="main-preview">
          <strong>Preview:</strong>
          <div class="main-preview-content">
            {@html generateClipboardContent(activeTemplate.template, previewData).html}
          </div>
        </div>
      {/key}
    {/if}
    <div class="config-bar">
      <button class="config-toggle" type="button" onclick={() => (configVisible = true)}>
        <Cog />
      </button>
    </div>
  {/if}
  {#if configVisible}
    <div class="config-container">
      <button class="config-close" type="button" onclick={() => (configVisible = false)}><Close /></button>

      <div class="config-section">
        <span class="config-section-title">Enterprise Hosts</span>
        <button type="button" onclick={addHost}>Add</button>
        <div class="host-list">
          <form onsubmit={onFormChange}>
            {#each enterpriseHosts as host, i}
              <div class="host-input-group">
                <input name={`host-value-${i}`} type="text" bind:value={host.value} onkeyup={onKeyUp} />
                <button class="trash-btn" onclick={() => removeHost(host)} type="button"><Trash /></button>
              </div>
            {:else}
              <span>Github Enterprise hosts can be added here.</span>
            {/each}
          </form>
        </div>
      </div>

      <div class="config-section">
        <span class="config-section-title">Link Templates</span>
        <button type="button" onclick={addTemplate} disabled={templates.length >= MAX_TEMPLATES}>
          Add Template {templates.length >= MAX_TEMPLATES ? `(Max ${MAX_TEMPLATES})` : ""}
        </button>

        <div class="template-list">
          {#each templates as template}
            <div class="template-item">
              <label>
                <input
                  type="radio"
                  name="active-template"
                  checked={template.isActive}
                  onchange={() => setActiveTemplate(template)}
                />
                <span class="template-name">{template.name}</span>
              </label>
              <div class="template-actions">
                <button type="button" onclick={() => startEditTemplate(template)}>Edit</button>
                <div class="delete-wrapper">
                  <button
                    class="trash-btn"
                    onclick={() => deleteTemplate(template)}
                    type="button"
                    disabled={template.id === "default"}
                  >
                    <Trash />
                  </button>
                  {#if confirmDelete && confirmDelete.id === template.id}
                    <div class="confirm-popover">
                      <button
                        class="confirm-btn confirm-yes"
                        type="button"
                        onclick={confirmDeleteTemplate}
                        title="Confirm delete"
                      >
                        <Check />
                      </button>
                      <button
                        class="confirm-btn confirm-no"
                        type="button"
                        onclick={cancelDeleteTemplate}
                        title="Cancel"
                      >
                        <Close />
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>

        {#if editingTemplate}
          <div class="template-editor">
            <h3>{editingTemplate.id.startsWith("template-") ? "Edit" : "New"} Template</h3>

            <label>
              Name:
              <input type="text" bind:value={editingTemplate.name} placeholder="Template name" />
            </label>

            <label>
              Plain Text Template:
              <textarea
                bind:value={editingTemplate.template.plain}
                oninput={onPlainTemplateChange}
                placeholder={"[${display}](${url}) - ${title}"}
                maxlength="1024"
              ></textarea>
              <small>{editingTemplate.template.plain.length} / 1024 characters</small>
            </label>

            <label>
              <div class="label-with-button">
                <span>HTML Template:</span>
                {#if htmlManuallyEdited}
                  <button type="button" class="reset-sync-btn" onclick={resetHtmlSync} title="Reset to auto-generate from plain text">
                    ↻ Sync from plain
                  </button>
                {/if}
              </div>
              <textarea
                bind:value={editingTemplate.template.html}
                oninput={onHtmlTemplateChange}
                placeholder={'<a href="${url}">${display}</a> - ${title}'}
                maxlength="1024"
              ></textarea>
              <small>{editingTemplate.template.html.length} / 1024 characters</small>
            </label>

            <div class="template-variables">
              <small>
                <strong>Available variables:</strong> ${"{"}org{"}"}, ${"{"}repo{"}"}, ${"{"}pr{"}"}, ${"{"}title{"}"},
                ${"{"}url{"}"}, ${"{"}display{"}"}
              </small>
            </div>

            {#if previewData}
              <div class="template-preview">
                <strong>Preview (Plain):</strong>
                <pre>{generateClipboardContent(editingTemplate.template, previewData).plain}</pre>
                <strong>Preview (HTML):</strong>
                <div class="preview-html">
                  {@html generateClipboardContent(editingTemplate.template, previewData).html}
                </div>
              </div>
            {/if}

            <div class="template-editor-actions">
              <button type="button" onclick={saveTemplate}>Save</button>
              <button type="button" onclick={cancelEditTemplate}>Cancel</button>
            </div>
          </div>
        {/if}
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

  .config-container {
    height: 600px;
    padding: 0.4rem;
    background-color: white;
    overflow-y: scroll;
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

  .trash-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .config-section-title {
    font-weight: 600;
    font-size: 16px;
  }

  .config-section {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #ddd;
  }

  .config-section:first-of-type {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }

  .host-list {
    margin-top: 0.4rem;
  }

  .host-input-group {
    display: flex;
    align-items: center;
    gap: 0.2rem;
  }

  .template-list {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .template-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .template-item label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .template-name {
    font-weight: 500;
  }

  .template-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .delete-wrapper {
    position: relative;
    display: inline-block;
  }

  .confirm-popover {
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    margin-right: 0.5rem;
    display: flex;
    gap: 0.25rem;
    background-color: white;
    padding: 0.25rem;
    border: 2px solid #282c34;
    border-radius: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    z-index: 10;
  }

  .template-editor {
    margin-top: 1rem;
    padding: 1rem;
    border: 2px solid #282c34;
    border-radius: 8px;
    background-color: #f9f9f9;
  }

  .template-editor h3 {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .template-editor label {
    display: block;
    margin-bottom: 1rem;
  }

  .label-with-button {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .reset-sync-btn {
    font-size: 11px;
    padding: 0.25rem 0.5rem;
    background-color: #e0e0e0;
    border: 1px solid #999;
    border-radius: 3px;
    cursor: pointer;
  }

  .reset-sync-btn:hover {
    background-color: #d0d0d0;
  }

  .template-editor input[type="text"] {
    width: 100%;
    padding: 0.5rem;
    margin-top: 0.25rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .template-editor textarea {
    width: 100%;
    min-height: 80px;
    padding: 0.5rem;
    margin-top: 0.25rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    resize: vertical;
  }

  .template-editor small {
    display: block;
    margin-top: 0.25rem;
    color: #666;
  }

  .template-variables {
    margin-bottom: 1rem;
    padding: 0.5rem;
    background-color: #e8f4f8;
    border-radius: 4px;
  }

  .template-preview {
    margin-top: 1rem;
    padding: 0.5rem;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .template-preview strong {
    display: block;
    margin-top: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .template-preview strong:first-child {
    margin-top: 0;
  }

  .template-preview pre {
    background-color: #f5f5f5;
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 12px;
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .preview-html {
    background-color: #f5f5f5;
    padding: 0.5rem;
    border-radius: 4px;
    min-height: 2rem;
  }

  .template-editor-actions {
    margin-top: 1rem;
    display: flex;
    gap: 0.5rem;
  }

  .template-editor-actions button {
    padding: 0.5rem 1rem;
    cursor: pointer;
  }

  .confirm-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .confirm-yes {
    background-color: #4caf50;
    color: white;
  }

  .confirm-yes:hover {
    background-color: #45a049;
  }

  .confirm-no {
    background-color: #f44336;
    color: white;
  }

  .confirm-no:hover {
    background-color: #da190b;
  }

  .confirm-btn :global(svg) {
    width: 16px;
    height: 16px;
  }
</style>

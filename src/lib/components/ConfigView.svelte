<script>
  import { appState } from "$lib/state.svelte.js";
  import { delay } from "$lib/util/delay";
  import { Close, Trash, Check } from "$lib/icons";
  import { generateClipboardContent, generateTemplateId, validateTemplate, MAX_TEMPLATES } from "$lib/template";
  import { markdownLinksToHtml } from "$lib/markdown";

  /** @import { Template } from '$lib/types.js' */

  /** @type {Template | null} */
  let editingTemplate = $state(null);
  /** @type {Template | null} */
  let confirmDelete = $state(null);
  let htmlManuallyEdited = $state(false);

  /**
   * @param {SubmitEvent} ev
   */
  async function onHostSubmit(ev) {
    ev.preventDefault();
    await appState.saveHosts();
  }

  const onKeyUp = delay(async () => {
    await appState.saveHosts();
  }, 100);

  function addTemplate() {
    if (appState.templates.length >= MAX_TEMPLATES) {
      return;
    }

    const plainTemplate = "[${display}](${url}) - ${title}";
    const newTemplate = {
      id: generateTemplateId(),
      name: `Template ${appState.templates.length + 1}`,
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
   * @param {Template} template
   */
  function startEditTemplate(template) {
    editingTemplate = { ...template, template: { ...template.template } };
    htmlManuallyEdited = false;
  }

  function cancelEditTemplate() {
    editingTemplate = null;
    htmlManuallyEdited = false;
  }

  function onPlainTemplateChange() {
    if (editingTemplate && !htmlManuallyEdited) {
      editingTemplate.template.html = markdownLinksToHtml(editingTemplate.template.plain);
    }
  }

  function onHtmlTemplateChange() {
    if (editingTemplate && (!editingTemplate.template.html || editingTemplate.template.html.trim() === "")) {
      htmlManuallyEdited = false;
      editingTemplate.template.html = markdownLinksToHtml(editingTemplate.template.plain);
    } else {
      htmlManuallyEdited = true;
    }
  }

  function resetHtmlSync() {
    if (editingTemplate) {
      htmlManuallyEdited = false;
      editingTemplate.template.html = markdownLinksToHtml(editingTemplate.template.plain);
    }
  }

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

    await appState.updateOrAddTemplate(editingTemplate);

    editingTemplate = null;
    htmlManuallyEdited = false;
  }

  /**
   * @param {Template} template
   */
  async function deleteTemplate(template) {
    if (template.id === "default") {
      return;
    }

    confirmDelete = template;
  }

  async function confirmDeleteTemplate() {
    if (!confirmDelete) return;

    await appState.deleteTemplate(confirmDelete);

    confirmDelete = null;
  }

  function cancelDeleteTemplate() {
    confirmDelete = null;
  }

  /**
   * @param {Template} template
   */
  async function setActiveTemplate(template) {
    await appState.setActiveTemplate(template);
  }
</script>

<div class="config-container">
  <button class="config-close" type="button" onclick={() => (appState.configVisible = false)}><Close /></button>

  <div class="config-section">
    <span class="config-section-title">Enterprise Hosts</span>
    <button
      class="btn config-section-title-btn"
      type="button"
      onclick={() => {
        appState.addEmptyHost();
      }}>Add</button
    >
    <div class="host-list">
      <form onsubmit={onHostSubmit}>
        {#each appState.enterpriseHosts as host, i}
          <div class="host-input-group">
            <input name={`host-value-${i}`} type="text" bind:value={host.value} onkeyup={onKeyUp} />
            <button class="btn trash-btn" onclick={() => appState.removeHost(host)} type="button"><Trash /></button>
          </div>
        {:else}
          <span class="text-sm">Github Enterprise hosts can be added here.</span>
        {/each}
      </form>
    </div>
  </div>

  <div class="config-section">
    <span class="config-section-title">Link Templates</span>
    <button
      class="btn config-section-title-btn"
      type="button"
      onclick={addTemplate}
      disabled={appState.templates.length >= MAX_TEMPLATES}
    >
      Add {appState.templates.length >= MAX_TEMPLATES ? `(Max ${MAX_TEMPLATES})` : ""}
    </button>

    <div class="template-list">
      {#each appState.templates as template}
        <div class={{ 'template-item': true, active: template.isActive }}>
          <label>
            <input
              type="radio"
              name="active-template"
              checked={template.isActive}
              onchange={() => setActiveTemplate(template)}
            />
            <span class="template-name text-sm">{template.name}</span>
          </label>
          <div class="template-actions">
            <button class="btn" type="button" onclick={() => startEditTemplate(template)}>Edit</button>
            <div class="delete-wrapper">
              <button
                class="btn trash-btn"
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
                  <button class="confirm-btn confirm-no" type="button" onclick={cancelDeleteTemplate} title="Cancel">
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
        <label>
          <span class="label-text">Name</span>
          <input type="text" bind:value={editingTemplate.name} placeholder="Template name" />
        </label>

        <label>
          <span class="label-text">Plain Text Template</span>
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
            <span class="label-text">HTML Template</span>
            {#if htmlManuallyEdited}
              <button
                type="button"
                class="reset-sync-btn"
                onclick={resetHtmlSync}
                title="Reset to auto-generate from plain text"
              >
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
            <strong>Available variables:</strong> ${"{"}org{"}"}, ${"{"}repo{"}"}, ${"{"}pr{"}"}, ${"{"}title{"}"}, ${"{"}url{"}"},
            ${"{"}display{"}"}
          </small>
        </div>

        {#if appState.currentPageContext}
          <div class="template-preview">
            <strong>Preview (Plain):</strong>
            <pre>{generateClipboardContent(editingTemplate.template, appState.currentPageContext).plain}</pre>
            <strong>Preview (HTML):</strong>
            <div class="preview-html text-sm">
              {@html generateClipboardContent(editingTemplate.template, appState.currentPageContext).html}
            </div>
          </div>
        {/if}

        <div class="template-editor-actions">
          <button class="btn" type="button" onclick={saveTemplate}>Save</button>
          <button class="btn" type="button" onclick={cancelEditTemplate}>Cancel</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .config-container {
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
    padding: 0.25rem;
    min-width: 28px;
  }

  .trash-btn :global(svg) {
    width: 14px;
    height: 14px;
  }

  .trash-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .config-section-title {
    font-weight: 600;
    font-size: 16px;
  }

  .config-section-title-btn {
    margin-left: 2px;
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
    background-color: white;
    transition: background-color 0.2s;
  }

  .template-item.active {
    background-color: #e8f4f8;
    border-color: #b3d9e6;
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
    padding: 0.7rem;
    margin-top: 0.7rem;
    border: 2px solid #282c34;
    border-radius: 8px;
    background-color: #f9f9f9;
  }

  .template-editor label {
    display: block;
    margin-bottom: 1rem;
  }

  .label-text {
    display: block;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .label-with-button {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .reset-sync-btn {
    font-size: 10px;
    padding: 0.25rem 0.5rem;
    background-color: #e0e0e0;
    border: 1px solid #999;
    border-radius: 3px;
    cursor: pointer;
    margin-bottom: 0.1rem;
  }

  .reset-sync-btn:hover {
    background-color: #d0d0d0;
  }

  .template-editor input[type="text"] {
    width: 100%;
    padding: 0.5rem;
    margin-top: 0.25rem;
    border: 2px solid #282c34;
    border-radius: 6px;
  }

  .template-editor textarea {
    width: 100%;
    min-height: 80px;
    padding: 0.5rem;
    border: 2px solid #282c34;
    border-radius: 6px;
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

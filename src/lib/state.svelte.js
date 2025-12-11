import browser from "webextension-polyfill";
import { isString } from "$lib/util/typecheck";
import { getDefaultTemplate } from "$lib/template";

class AppState {
  copyEnabled = $state(false);
  btnText = $state("Copy");
  configVisible = $state(false);
  enterpriseHosts = $state([]);
  templates = $state([]);
  previewData = $state(null);
  copiedTimeout = null;

  activeTemplate = $derived(this.templates.find((t) => t.isActive) || this.templates[0]);

  async initialize() {
    const entry = await browser.storage.local.get(["enterpriseHosts", "templates"]);

    if (isString(entry.enterpriseHosts)) {
      this.enterpriseHosts = JSON.parse(entry.enterpriseHosts);
    }

    if (isString(entry.templates)) {
      this.templates = JSON.parse(entry.templates);
    } else if (!entry.templates) {
      this.templates = [getDefaultTemplate()];
      await browser.storage.local.set({
        templates: JSON.stringify(this.templates),
      });
    }
  }

  async addEmptyHost() {
    appState.enterpriseHosts.push({
      value: "",
    });
  }

  async removeHost(host) {
    appState.enterpriseHosts = appState.enterpriseHosts.filter((h) => h.value !== host.value);
    appState.saveHosts();
  }

  async saveHosts() {
    await browser.storage.local.set({
      enterpriseHosts: JSON.stringify(this.enterpriseHosts),
    });
  }

  async saveTemplates() {
    await browser.storage.local.set({
      templates: JSON.stringify(this.templates),
    });
  }
}

export const appState = new AppState();

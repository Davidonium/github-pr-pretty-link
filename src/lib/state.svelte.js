/** @import { Template, EnterpriseHost } from './types.js' */

import browser from "webextension-polyfill";
import { isString } from "$lib/util/typecheck";
import { getDefaultTemplate } from "$lib/template";

class AppState {
  configVisible = $state(false);
  enterpriseHosts = $state([]);
  templates = $state([]);
  activeTemplate = $derived(this.templates.find((t) => t.isActive) || this.templates[0]);
  currentPageContext = $state({})

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

  /**
   * @param {EnterpriseHost} host
   */
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

  /**
   * @param {Template} template
   */
  async updateOrAddTemplate(template) {
    const existingIndex = this.templates.findIndex((t) => t.id === template.id);
    if (existingIndex >= 0) {
      this.templates[existingIndex] = template;
    } else {
      this.templates = [...this.templates, template];
    }
    await this.saveTemplates();
  }

  /**
   * @param {Template} template
   */
  async deleteTemplate(template) {
    if (template.id === "default") {
      return false;
    }

    this.templates = this.templates.filter((t) => t.id !== template.id);

    if (template.isActive && this.templates.length > 0) {
      this.templates[0].isActive = true;
    }

    await this.saveTemplates();
    return true;
  }

  /**
   * @param {Template} template
   */
  async setActiveTemplate(template) {
    this.templates = this.templates.map((t) => ({
      ...t,
      isActive: t.id === template.id,
    }));

    await this.saveTemplates();
  }
}

export const appState = new AppState();

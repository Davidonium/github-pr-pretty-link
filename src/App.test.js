import { render, screen, waitFor } from "@testing-library/svelte";
import { test, expect, vi } from "vitest";
import App from "./App.svelte";
import browser from "webextension-polyfill";

test("the copy button is visible and enabled", async () => {
  vi.mocked(browser.storage.local.get).mockReturnValue(Promise.resolve({
    enterpriseHosts: undefined,
  }));

  vi.mocked(browser.tabs.query).mockReturnValue(
    Promise.resolve([{
      index: 0,
      active: true,
      highlighted: true,
      pinned: false,
      incognito: false,
      url: "https://github.com/Davidonium/test-project/pull/1234"
    }])
  );

  render(App);

  /** @type {HTMLButtonElement} */
  const copyBtn = screen.getByRole("button", { name: "Copy" });

  await waitFor(() => expect(copyBtn).not.toBeDisabled())
});


test("the copy button is disabled when the active tab is not a pull request page", async () => {
  vi.mocked(browser.storage.local.get).mockReturnValue(Promise.resolve({
    enterpriseHosts: undefined,
  }));

  vi.mocked(browser.tabs.query).mockReturnValue(
    Promise.resolve([{
      index: 0,
      active: true,
      highlighted: true,
      pinned: false,
      incognito: false,
      url: "https://github.com/Davidonium/test-project"
    }])
  );

  render(App);

  /** @type {HTMLButtonElement} */
  const copyBtn = screen.getByRole("button", { name: "Copy" });

  expect(copyBtn).toBeInTheDocument();
  await waitFor(() => expect(copyBtn).toBeDisabled())
})

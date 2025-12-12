import { test, expect } from "vitest";
import {
  renderTemplate,
  validateTemplate,
  generateClipboardContent,
  getDefaultTemplate,
  generateTemplateId,
  MAX_TEMPLATES,
  MAX_TEMPLATE_LENGTH,
} from "./template";

test("renderTemplate replaces variables", () => {
  const template = "[${display}](${url}) - ${title}";
  const variables = {
    display: "org/repo#123",
    url: "https://github.com/org/repo/pull/123",
    title: "Fix bug",
  };

  const result = renderTemplate(template, variables);
  expect(result).toBe("[org/repo#123](https://github.com/org/repo/pull/123) - Fix bug");
});

test("renderTemplate keeps unknown variables as-is", () => {
  const template = "${display} - ${unknown}";
  const variables = { display: "org/repo#123" };

  const result = renderTemplate(template, variables);
  expect(result).toBe("org/repo#123 - ${unknown}");
});

test("renderTemplate handles empty template", () => {
  const result = renderTemplate("", { display: "test" });
  expect(result).toBe("");
});

test("validateTemplate accepts valid template", () => {
  const templateObj = {
    plain: "[${display}](${url})",
    html: '<a href="${url}">${display}</a>',
  };

  const result = validateTemplate(templateObj);
  expect(result.valid).toBe(true);
  expect(result.errors).toHaveLength(0);
});

test("validateTemplate rejects missing plain template", () => {
  const templateObj = {
    html: '<a href="${url}">${display}</a>',
  };

  const result = validateTemplate(templateObj);
  expect(result.valid).toBe(false);
  expect(result.errors).toContain("Plain template is required");
});

test("validateTemplate rejects missing html template", () => {
  const templateObj = {
    plain: "[${display}](${url})",
  };

  const result = validateTemplate(templateObj);
  expect(result.valid).toBe(false);
  expect(result.errors).toContain("HTML template is required");
});

test("validateTemplate rejects template exceeding max length", () => {
  const longString = "a".repeat(MAX_TEMPLATE_LENGTH + 1);
  const templateObj = {
    plain: longString,
    html: longString,
  };

  const result = validateTemplate(templateObj);
  expect(result.valid).toBe(false);
  expect(result.errors).toHaveLength(2);
  expect(result.errors[0]).toContain("exceeds");
  expect(result.errors[1]).toContain("exceeds");
});

test("generateClipboardContent returns both formats", () => {
  const templateObj = {
    plain: "[${display}](${url}) - ${title}",
    html: '<a href="${url}">${display}</a> - ${title}',
  };
  const variables = {
    display: "org/repo#123",
    url: "https://github.com/org/repo/pull/123",
    title: "Fix bug",
  };

  const result = generateClipboardContent(templateObj, variables);

  expect(result.plain).toBe("[org/repo#123](https://github.com/org/repo/pull/123) - Fix bug");
  expect(result.html).toBe('<a href="https://github.com/org/repo/pull/123">org/repo#123</a> - Fix bug');
});

test("getDefaultTemplate returns valid structure", () => {
  const template = getDefaultTemplate();

  expect(template).toHaveProperty("id");
  expect(template).toHaveProperty("name");
  expect(template).toHaveProperty("template");
  expect(template.template).toHaveProperty("plain");
  expect(template.template).toHaveProperty("html");
  expect(template.isActive).toBe(true);
});

test("generateTemplateId generates unique IDs", () => {
  const id1 = generateTemplateId();
  const id2 = generateTemplateId();

  expect(id1).not.toBe(id2);
  expect(id1).toMatch(/^template-/);
  expect(id2).toMatch(/^template-/);
});

test("MAX_TEMPLATES is defined", () => {
  expect(MAX_TEMPLATES).toBe(20);
});

test("MAX_TEMPLATE_LENGTH is defined", () => {
  expect(MAX_TEMPLATE_LENGTH).toBe(1024);
});

test("renderTemplate handles special characters in title", () => {
  const template = "${title}";
  const variables = {
    title: 'Fix "bug" & <issue>',
  };

  const result = renderTemplate(template, variables);
  expect(result).toBe('Fix "bug" & <issue>');
});

test("renderTemplate handles multiple occurrences of same variable", () => {
  const template = "${display} ${display} ${display}";
  const variables = { display: "org/repo#123" };

  const result = renderTemplate(template, variables);
  expect(result).toBe("org/repo#123 org/repo#123 org/repo#123");
});

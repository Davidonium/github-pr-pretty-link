export const MAX_TEMPLATES = 20;
export const MAX_TEMPLATE_LENGTH = 1024;

/**
 * Renders a template string by replacing ${variable} placeholders
 * @param {string} template
 * @param {Object} variables - {org, repo, pr, title, url, display}
 * @returns {string}
 */
export function renderTemplate(template, variables) {
  return template.replace(/\$\{(\w+)\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}

/**
 * Validates a template object
 * @param {{plain: string, html: string}} templateObj
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateTemplate(templateObj) {
  const errors = [];

  if (!templateObj.plain || typeof templateObj.plain !== "string") {
    errors.push("Plain template is required");
  } else if (templateObj.plain.length > MAX_TEMPLATE_LENGTH) {
    errors.push(`Plain template exceeds ${MAX_TEMPLATE_LENGTH} characters`);
  }

  if (!templateObj.html || typeof templateObj.html !== "string") {
    errors.push("HTML template is required");
  } else if (templateObj.html.length > MAX_TEMPLATE_LENGTH) {
    errors.push(`HTML template exceeds ${MAX_TEMPLATE_LENGTH} characters`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generates clipboard content in multiple formats
 * @param {{plain: string, html: string}} templateObj
 * @param {Object} variables - {org, repo, pr, title, url, display}
 * @returns {{plain: string, html: string}}
 */
export function generateClipboardContent(templateObj, variables) {
  return {
    plain: renderTemplate(templateObj.plain, variables),
    html: renderTemplate(templateObj.html, variables),
  };
}

/**
 * Gets the default template structure
 * @returns {{id: string, name: string, template: {plain: string, html: string}, isActive: boolean}}
 */
export function getDefaultTemplate() {
  return {
    id: "default",
    name: "Default",
    template: {
      plain: "[${display}](${url}) - ${title}",
      html: '<a href="${url}">${display}</a> - ${title}',
    },
    isActive: true,
  };
}

/**
 * Generates a unique ID for a template
 * @returns {string}
 */
export function generateTemplateId() {
  return `template-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

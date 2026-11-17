const ALLOWED_TAGS = new Set([
  "a", "b", "blockquote", "br", "div", "em", "h1", "h2", "h3", "h4",
  "hr", "i", "li", "ol", "p", "span", "strong", "u", "ul",
]);
const ALLOWED_STYLES = new Set([
  "color", "background-color", "font-family", "font-size", "font-style", "font-weight",
  "line-height", "margin", "margin-bottom", "margin-left", "margin-right", "margin-top",
  "max-width", "padding", "padding-bottom", "padding-left", "padding-right", "padding-top",
  "text-align", "text-decoration",
]);

const sanitizeStyle = (value: string) => value
  .split(";")
  .map((declaration) => declaration.trim())
  .filter(Boolean)
  .filter((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator < 1) return false;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const styleValue = declaration.slice(separator + 1).trim().toLowerCase();
    return ALLOWED_STYLES.has(property) && !/url\s*\(|expression\s*\(|javascript:|data:/i.test(styleValue);
  })
  .join("; ");

export const sanitizeCampaignHtml = (html: string): string => {
  if (typeof DOMParser === "undefined") return "";
  const document = new DOMParser().parseFromString(html, "text/html");

  const visit = (element: Element) => {
    for (const child of Array.from(element.children)) {
      if (!ALLOWED_TAGS.has(child.tagName.toLowerCase())) {
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }

      for (const attribute of Array.from(child.attributes)) {
        const name = attribute.name.toLowerCase();
        if (name === "style") {
          const safeStyle = sanitizeStyle(attribute.value);
          if (safeStyle) child.setAttribute("style", safeStyle);
          else child.removeAttribute("style");
        } else if (name === "href" && child.tagName.toLowerCase() === "a") {
          if (!/^(https?:|mailto:|tel:|\/|#)/i.test(attribute.value.trim())) child.removeAttribute("href");
        } else if (!(["class", "title"].includes(name))) {
          child.removeAttribute(attribute.name);
        }
      }

      if (child.tagName.toLowerCase() === "a" && child.hasAttribute("href")) {
        child.setAttribute("rel", "noopener noreferrer");
        child.setAttribute("target", "_blank");
      }
      visit(child);
    }
  };

  visit(document.body);
  return document.body.innerHTML;
};

export const resolveCampaignVariables = (
  template: string,
  variables: Record<string, string | number | null | undefined>,
) => template.replace(/\{\{?([a-z_][a-z0-9_]*)\}?\}/gi, (match, key: string) => {
  const value = variables[key];
  return value === null || value === undefined ? "" : String(value);
});

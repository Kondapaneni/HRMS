const ALLOWED_TAGS = new Set(["a","abbr","b","blockquote","br","caption","center","code","div","em","font","h1","h2","h3","h4","hr","i","img","li","ol","p","pre","s","small","span","strong","sub","sup","table","tbody","td","th","thead","tr","u","ul"]);
const DROP_CONTENT_TAGS = new Set(["script","style","iframe","object","embed","svg","math","form","input","button","textarea","select","option","meta","link","base","video","audio"]);
const ALLOWED_ATTRIBUTES = new Set(["alt","align","border","cellpadding","cellspacing","class","colspan","dir","height","href","lang","role","rowspan","src","target","title","valign","width"]);
const ALLOWED_STYLES = new Set(["background-color","border","border-bottom","border-collapse","border-color","border-radius","border-spacing","border-style","border-top","border-width","color","display","font-family","font-size","font-style","font-weight","height","line-height","margin","margin-bottom","margin-left","margin-right","margin-top","max-width","padding","padding-bottom","padding-left","padding-right","padding-top","text-align","text-decoration","vertical-align","white-space","width"]);
function safeUrl(value, isImage = false) {
  const candidate = String(value || "").trim();
  if (!candidate || /^[#\\/]|^\\.\\.?\\//.test(candidate)) return candidate;
  try {
    const parsed = new URL(candidate, window.location.href);
    const allowed = isImage ? ["https:","http:"] : ["https:","http:","mailto:","tel:"];
    return allowed.includes(parsed.protocol) ? candidate : "";
  } catch { return ""; }
}
function cleanStyle(value) {
  const holder = document.createElement("span");
  holder.setAttribute("style", value);
  const style = holder.style;
  for (const property of Array.from(style)) {
    const cssValue = style.getPropertyValue(property);
    if (!ALLOWED_STYLES.has(property) || /url\\s*\\(|expression\\s*\\(|javascript:|@import|behavior\\s*:/i.test(cssValue)) style.removeProperty(property);
  }
  return style.cssText;
}
export function sanitizeEmailHtml(html) {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return "";
  const parsed = new DOMParser().parseFromString(String(html || ""), "text/html");
  const cleanChildren = (parent) => {
    for (const element of Array.from(parent.children)) {
      const tag = element.tagName.toLowerCase();
      if (DROP_CONTENT_TAGS.has(tag)) { element.remove(); continue; }
      cleanChildren(element);
      if (!ALLOWED_TAGS.has(tag)) { element.replaceWith(...Array.from(element.childNodes)); continue; }
      for (const attribute of Array.from(element.attributes)) {
        const name = attribute.name.toLowerCase();
        if (name.startsWith("on") || name === "srcset" || name === "xlink:href") { element.removeAttribute(attribute.name); continue; }
        if (name === "style") {
          const safe = cleanStyle(attribute.value);
          if (safe) element.setAttribute("style", safe); else element.removeAttribute("style");
          continue;
        }
        if (name === "href" || name === "src") {
          const safe = safeUrl(attribute.value, name === "src");
          if (safe) element.setAttribute(name, safe); else element.removeAttribute(name);
          continue;
        }
        if (!ALLOWED_ATTRIBUTES.has(name)) element.removeAttribute(attribute.name);
      }
      if (tag === "a" && element.getAttribute("target") === "_blank") element.setAttribute("rel", "noopener noreferrer");
    }
  };
  cleanChildren(parsed.body);
  return parsed.body.innerHTML;
}

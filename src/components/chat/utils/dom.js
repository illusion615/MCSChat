export const h = (tag, props = {}, ...children) => {
  const el = document.createElement(tag);
  Object.entries(props || {}).forEach(([k,v]) => {
    if (k === 'class') el.className = v; else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v); else el.setAttribute(k, v);
  });
  children.flat().forEach(c => el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return el;
};

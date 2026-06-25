import KANJIVG_CACHE from './kanjivg-cache.js';

export const fetchKanaVGPaths = async (char) => {
  if (KANJIVG_CACHE[char]) {
    return KANJIVG_CACHE[char];
  }
  const unicode = char.charCodeAt(0).toString(16).padStart(5, '0');
  const url = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${unicode}.svg`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch error');
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'image/svg+xml');

    const pathsGroup = doc.querySelector('g[id^="kvg:StrokePaths"]');
    if (!pathsGroup) return null;

    const rootKanjiGroup = pathsGroup.firstElementChild;
    if (!rootKanjiGroup) return null;

    const result = [];
    const paths = pathsGroup.querySelectorAll('path');
    const groupMap = new Map();
    let groupIndex = 0;

    paths.forEach(p => {
      let targetNode = p;
      while (targetNode && targetNode.parentElement !== rootKanjiGroup) {
        targetNode = targetNode.parentElement;
      }
      if (!groupMap.has(targetNode)) {
        groupMap.set(targetNode, groupIndex++);
      }
      result.push({ d: p.getAttribute('d'), groupId: groupMap.get(targetNode) });
    });
    return result;
  } catch (error) { return null; }
};

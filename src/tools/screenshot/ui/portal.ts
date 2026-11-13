/**
 * One host for everything the studio portals out of its frame (popovers,
 * dialogs, the drag ghost). It carries the `.sst` scope so the studio's styles
 * reach them, and sits above the page (and the full-screen editor).
 */
let host: HTMLElement | null = null;

export function portalHost(): HTMLElement {
  if (host?.isConnected) return host;
  host = document.createElement("div");
  host.className = "sst sst-layer";
  document.body.appendChild(host);
  return host;
}

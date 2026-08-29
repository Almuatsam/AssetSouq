const PORTAL_ROOT_ID = "tour-portal-root";

// Lazily created rather than declared in index.html — nothing else in
// this app has needed a portal target before now (see the "no Modal/
// Dialog/Portal exists" finding this feature is built on). Everything
// rendered into it is `position: fixed`, so it never participates in
// document flow and can't cause layout shift.
export function getTourPortalRoot(): HTMLElement {
  let root = document.getElementById(PORTAL_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = PORTAL_ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

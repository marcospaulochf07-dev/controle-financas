let domSafetyInstalled = false;

export function installDomSafetyGuards() {
  if (typeof window === "undefined" || domSafetyInstalled) return;

  domSafetyInstalled = true;

  const originalRemoveChild = Node.prototype.removeChild;
  const originalInsertBefore = Node.prototype.insertBefore;

  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (!child || child.parentNode !== this) {
      return child;
    }

    try {
      return originalRemoveChild.call(this, child) as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") {
        return child;
      }

      throw error;
    }
  };

  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode) as T;
    }

    try {
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") {
        return this.appendChild(newNode) as T;
      }

      throw error;
    }
  };

  document.documentElement.setAttribute("translate", "no");
  document.body.setAttribute("translate", "no");
  document.documentElement.classList.add("notranslate");
  document.body.classList.add("notranslate");
}

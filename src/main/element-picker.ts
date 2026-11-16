// Runs only in an isolated renderer world, without Node or an IPC bridge.
export function elementPicker(): Promise<string | null> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    host.style.cssText =
      "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none";
    const root = host.attachShadow({ mode: "closed" });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(
      `*{box-sizing:border-box} .box{position:fixed;border:2px solid #76d6c6;background:#76d6c620;pointer-events:none} .panel{position:fixed;left:12px;right:12px;bottom:12px;padding:14px;background:#1b2229;color:#e5edf3;border:1px solid #52616e;border-radius:10px;font:13px Segoe UI;pointer-events:auto;box-shadow:0 4px 20px #0008} button{background:#30443e;color:white;border:1px solid #6c8c84;border-radius:5px;padding:7px;margin:4px;cursor:pointer} input{width:100%;margin:10px 0} p{margin:5px 0;overflow-wrap:anywhere}`,
    );
    root.adoptedStyleSheets = [sheet];
    const box = document.createElement("div");
    box.className = "box";
    const panel = document.createElement("div");
    panel.className = "panel";
    const label = document.createElement("p");
    label.textContent = "Element anklicken · Escape bricht ab";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.value = "0";
    slider.disabled = true;
    slider.setAttribute("aria-label", "Übergeordnete Container");
    const info = document.createElement("p");
    const save = document.createElement("button");
    save.textContent = "Ausblenden";
    save.disabled = true;
    const again = document.createElement("button");
    again.textContent = "Neu auswählen";
    const cancel = document.createElement("button");
    cancel.textContent = "Abbrechen";
    const restore = document.createElement("button");
    restore.textContent = "Wiederherstellen";
    const handle = document.createElement("p");
    handle.textContent = "Elemente ausblenden · Zum Verschieben ziehen";
    handle.style.cssText = "cursor:move;touch-action:none;font-weight:600";
    handle.onpointerdown = (e) => {
      e.preventDefault();
      const b = panel.getBoundingClientRect();
      const dx = e.clientX - b.x,
        dy = e.clientY - b.y;
      handle.setPointerCapture(e.pointerId);
      panel.style.width = b.width + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      panel.style.left = b.x + "px";
      panel.style.top = b.y + "px";
      handle.onpointermove = (event) => {
        panel.style.left =
          Math.max(
            0,
            Math.min(innerWidth - panel.offsetWidth, event.clientX - dx),
          ) + "px";
        panel.style.top =
          Math.max(
            0,
            Math.min(innerHeight - panel.offsetHeight, event.clientY - dy),
          ) + "px";
      };
      handle.onpointerup = () => {
        handle.onpointermove = null;
      };
    };
    panel.append(handle, label, slider, info, save, again, restore, cancel);
    root.append(box, panel);
    document.documentElement.append(host);
    let chain: Element[] = [],
      selected: Element | null = null,
      locked = false;
    const selectorFor = (el: Element): string => {
      const parts: string[] = [];
      for (
        let cur: Element | null = el;
        cur && cur !== document.documentElement;
        cur = cur.parentElement
      ) {
        if (
          cur.id &&
          document.querySelectorAll("#" + CSS.escape(cur.id)).length === 1
        ) {
          parts.unshift("#" + CSS.escape(cur.id));
          break;
        }
        let part = cur.tagName.toLowerCase();
        const classes = Array.from(cur.classList)
          .filter((c) => /^[a-zA-Z][\w-]{0,60}$/.test(c))
          .slice(0, 3);
        if (classes.length)
          part += "." + classes.map((c) => CSS.escape(c)).join(".");
        const siblings = cur.parentElement
          ? Array.from(cur.parentElement.children).filter(
              (x) => x.tagName === cur!.tagName,
            )
          : [];
        if (siblings.length > 1)
          part += `:nth-of-type(${siblings.indexOf(cur) + 1})`;
        parts.unshift(part);
        const candidate = parts.join(" > ");
        if (document.querySelectorAll(candidate).length === 1) break;
      }
      return parts.join(" > ");
    };
    const show = (el: Element) => {
      selected = el;
      const b = el.getBoundingClientRect();
      box.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.width}px;height:${b.height}px`;
      info.textContent = selectorFor(el);
    };
    const move = (e: MouseEvent) => {
      if (!locked && e.target instanceof Element && e.target !== host)
        show(e.target);
    };
    const click = (e: MouseEvent) => {
      if (e.target === host) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (locked || !(e.target instanceof Element)) return;
      chain = [];
      for (
        let el: Element | null = e.target;
        el && el !== document.body && el !== document.documentElement;
        el = el.parentElement
      )
        chain.push(el);
      if (!chain.length) return;
      locked = true;
      slider.disabled = false;
      slider.max = String(chain.length - 1);
      slider.value = "0";
      save.disabled = false;
      show(chain[0]);
      label.textContent = "Slider: größere oder kleinere Container auswählen";
    };
    const blockPointer = (e: Event) => {
      if (e.target !== host) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener("pointerdown", blockPointer, true);
    const done = (value: string | null) => {
      document.removeEventListener("pointerdown", blockPointer, true);
      document.removeEventListener("mousemove", move, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("pagehide", abort);
      host.remove();
      resolve(value);
    };
    const abort = () => done(null);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        done(null);
      }
    };
    slider.oninput = () => show(chain[Number(slider.value)]);
    save.onclick = () => {
      if (selected) done(selectorFor(selected));
    };
    restore.onclick = () => done("__INDIGODOCK_RESTORE__");
    cancel.onclick = abort;
    again.onclick = () => {
      locked = false;
      save.disabled = true;
      slider.disabled = true;
      label.textContent = "Element anklicken · Escape bricht ab";
    };
    document.addEventListener("mousemove", move, true);
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("pagehide", abort);
  });
}

import { ipcRenderer } from "electron";
import type { PromptOptions } from "./prompt";
import type { Config } from "../shared/model";
ipcRenderer.once("prompt-data", (_e, data: PromptOptions & {settings: Config["settings"]}) => {
  const de = data.settings.language === "de";
  document.documentElement.lang = de ? "de" : "en";
  const style = document.createElement("style");
  style.textContent = `*{box-sizing:border-box}body{margin:0;padding:24px;color:#e4ebf0;background:${data.settings.dockColor};font:${data.settings.fontSize}px 'Segoe UI',sans-serif;height:100vh;display:flex;flex-direction:column;gap:16px}h2{font-size:1.3em;margin:0;-webkit-app-region:drag}p{margin:0;line-height:1.5;overflow-wrap:anywhere}button{font:inherit;color:inherit;border:1px solid #64747c;border-radius:9px;background:transparent;padding:12px 18px;cursor:pointer}button:focus-visible{outline:2px solid ${data.settings.accentColor};outline-offset:2px}button.selected,.primary{background:${data.settings.accentColor};color:#101416}footer{display:flex;gap:12px;justify-content:space-between;margin-top:auto}main{overflow:auto;display:grid;grid-template-columns:1fr 1fr;gap:12px;flex:1}main button{padding:8px;min-width:0}img{display:block;width:100%;height:120px;object-fit:contain;background:#15191c;margin-bottom:8px}label{display:flex;align-items:center;gap:10px}input{accent-color:${data.settings.accentColor}}`;
  document.head.append(style);
  const add = (tag: string, text: string, parent = document.body) => {const el = document.createElement(tag); el.textContent = text; parent.append(el); return el;};
  add("h2", data.title || "IndigoDock");
  add("p", data.message);
  if(data.detail) add("p", data.detail);
  let audio: HTMLInputElement | undefined;
  let selection = -1;
  const footer = document.createElement("footer");
  const send = (response: number) => ipcRenderer.send("prompt-answer", {response, audio: audio?.checked === true});
  if(data.sources) {
    const list = add("main", "");
    data.sources.forEach((source, index) => {
      const button = document.createElement("button");
      const img = document.createElement("img");img.src = source.image;img.alt = "";button.append(img);
      add("span", source.name, button);list.append(button);
      button.onclick = () => {selection = index + 1; list.querySelectorAll("button").forEach(b=>b.classList.toggle("selected", b === button));confirm.disabled=false;};
    });
    if(data.audio) {const label = add("label", de ? "Gesamten Windows-Systemton teilen" : "Share all Windows system audio"); audio = document.createElement("input");audio.type="checkbox";label.prepend(audio);}
    const cancel = add("button", de ? "Abbrechen" : "Cancel", footer);cancel.onclick=()=>send(0);
    const confirm = add("button", de ? "Teilen" : "Share", footer) as HTMLButtonElement;confirm.className="primary";confirm.disabled=true;confirm.onclick=()=>send(selection);
  } else data.buttons.forEach((text,index)=>{const b=add("button", text, footer);if(index===data.buttons.length-1&&index>0)b.className="primary";b.onclick=()=>send(index);});
  document.body.append(footer);
  document.addEventListener("keydown", e=>{if(e.key==="Escape")send(data.cancelId??0);});
  (footer.firstElementChild as HTMLElement)?.focus();
});

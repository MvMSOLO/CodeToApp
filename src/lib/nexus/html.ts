const PROBE = `<script>(function(){
  var frames=0,last=performance.now();
  function loop(t){
    frames++;
    if(t-last>500){
      try{parent.postMessage({type:"nexus-hud",fps:Math.round(frames*1000/(t-last)),frame:Math.round((t-last)/frames)},"*");}catch(e){}
      frames=0;last=t;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  ["log","warn","error"].forEach(function(k){
    var orig=console[k].bind(console);
    console[k]=function(){
      var text="";
      try{text=Array.prototype.map.call(arguments,function(a){if(typeof a==="string")return a;try{return JSON.stringify(a);}catch(e){return String(a);}}).join(" ").slice(0,480);}catch(e){}
      try{parent.postMessage({type:"nexus-log",level:k,text:text},"*");}catch(e){}
      return orig.apply(console,arguments);
    };
  });
  window.addEventListener("error",function(e){
    try{parent.postMessage({type:"nexus-log",level:"error",text:String(e.message||"error")},"*");}catch(err){}
  });
})();</script>`;

export function htmlNotes(code: string): string[] {
  const notes: string[] = [];
  if (/<script[^>]+src\s*=/i.test(code)) notes.push("External scripts load only when you are online.");
  if (/\beval\s*\(|new\s+Function\s*\(/.test(code)) notes.push("eval is sealed inside the stage and may do nothing.");
  if (/document\.cookie|localStorage|indexedDB/i.test(code)) {
    notes.push("Page storage stays inside the frame. It cannot touch Nexus Runner.");
  }
  if (/https?:\/\//i.test(code)) notes.push("Remote images or fonts need a connection.");
  return notes;
}

export function prepareHtml(source: string): string {
  let html = source.trim();
  if (!html) {
    html = "<!doctype html><html><body><p>Empty document.</p></body></html>";
  }
  if (!/<html[\s>]/i.test(html)) {
    html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${html}</body></html>`;
  } else if (!/<meta[^>]+viewport/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => `${m}<meta name="viewport" content="width=device-width, initial-scale=1">`);
  }
  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${PROBE}</body>`);
  else html += PROBE;
  return html;
}

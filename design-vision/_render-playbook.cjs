// Standalone MD -> styled HTML (no deps). Warm-themed to match the playbook itself.
// Usage: node design-vision/_render-playbook.cjs [path/to/file.md]
const fs = require("fs");
const path = require("path");

const inPath = process.argv[2] || path.join(__dirname, "PLAYBOOK-WARM.md");
const outPath = inPath.replace(/\.md$/i, ".html");
const md = fs.readFileSync(inPath, "utf8");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(text) {
  let s = esc(text);
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_m, c) => { codes.push(c); return "" + (codes.length - 1) + ""; });
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => `<a href="${u}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/(\d+)/g, (_m, n) => `<code>${codes[+n]}</code>`);
  return s;
}

function splitRow(line) {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t.split("|").map((c) => inline(c.trim()));
}

const lines = md.split(/\r?\n/);
const isSep = (l) => l != null && l.includes("-") && /^\s*\|?[-:\s|]+\|?\s*$/.test(l);
const out = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  if (/^\s*$/.test(line)) { i++; continue; }

  if (line.trim().startsWith("```")) {
    i++;
    const buf = [];
    while (i < lines.length && !lines[i].trim().startsWith("```")) { buf.push(esc(lines[i])); i++; }
    i++;
    out.push("<pre><code>" + buf.join("\n") + "</code></pre>");
    continue;
  }

  const h = line.match(/^(#{1,6})\s+(.*)$/);
  if (h) { const lvl = h[1].length; out.push(`<h${lvl}>${inline(h[2].trim())}</h${lvl}>`); i++; continue; }

  if (/^\s*-{3,}\s*$/.test(line) && !line.includes("|")) { out.push("<hr>"); i++; continue; }

  if (line.trim().startsWith("|") && isSep(lines[i + 1])) {
    const header = splitRow(line);
    i += 2;
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(splitRow(lines[i])); i++; }
    let t = "<table><thead><tr>" + header.map((c) => `<th>${c}</th>`).join("") + "</tr></thead><tbody>";
    for (const r of rows) t += "<tr>" + r.map((c) => `<td>${c}</td>`).join("") + "</tr>";
    out.push(t + "</tbody></table>");
    continue;
  }

  if (/^\s*>/.test(line)) {
    const buf = [];
    while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(inline(lines[i].replace(/^\s*>\s?/, ""))); i++; }
    out.push("<blockquote>" + buf.join("<br>") + "</blockquote>");
    continue;
  }

  if (/^\s*[-*]\s+/.test(line)) {
    const buf = [];
    while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { buf.push("<li>" + inline(lines[i].replace(/^\s*[-*]\s+/, "")) + "</li>"); i++; }
    out.push("<ul>" + buf.join("") + "</ul>");
    continue;
  }

  if (/^\s*\d+\.\s+/.test(line)) {
    const buf = [];
    while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { buf.push("<li>" + inline(lines[i].replace(/^\s*\d+\.\s+/, "")) + "</li>"); i++; }
    out.push("<ol>" + buf.join("") + "</ol>");
    continue;
  }

  const buf = [line];
  i++;
  while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i]) &&
    !lines[i].trim().startsWith("```") && !/^\s*>/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) &&
    !/^\s*\d+\.\s+/.test(lines[i]) && !lines[i].trim().startsWith("|") && !/^\s*-{3,}\s*$/.test(lines[i])) {
    buf.push(lines[i]); i++;
  }
  out.push("<p>" + inline(buf.join(" ")) + "</p>");
}

const CSS = `
:root{--linen:#F5F1EA;--linen2:#FBF8F1;--khaki:#EAE3D5;--line:#E2D9C8;--line2:#CDBFA6;--camel:#B2967D;--cocoa:#7D5A44;--espresso:#4A342A;--wine:#743014;--caramel:#84592B;
--disp:'Cormorant Garamond',Georgia,serif;--sans:'IBM Plex Sans',system-ui,sans-serif;--mono:'IBM Plex Mono',ui-monospace,monospace;}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--linen);color:var(--espresso);font-family:var(--sans);font-size:15px;line-height:1.62;
background-image:radial-gradient(120% 90% at 10% -5%,#FBF8F1 0%,transparent 55%),radial-gradient(90% 80% at 95% 100%,#EFE6D7 0%,transparent 60%);background-attachment:fixed}
.doc{max-width:1060px;margin:0 auto;padding:60px 44px 120px}
h1{font-family:var(--disp);font-weight:600;font-size:48px;line-height:1.04;letter-spacing:-.01em;margin:0 0 6px}
h2{font-family:var(--disp);font-weight:600;font-size:31px;line-height:1.12;margin:56px 0 16px;padding-top:20px;border-top:1px solid var(--line)}
h2::before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--wine);margin-right:12px;vertical-align:middle}
h3{font-family:var(--disp);font-style:italic;font-weight:600;font-size:23px;margin:30px 0 10px;color:var(--cocoa)}
p{margin:11px 0}a{color:var(--wine);text-decoration:underline;text-underline-offset:2px}
strong{font-weight:600}em{color:var(--cocoa)}
hr{border:none;border-top:1px solid var(--line);margin:32px 0}
code{font-family:var(--mono);font-size:.85em;background:var(--khaki);color:var(--caramel);padding:.08em .38em;border-radius:4px;border:1px solid var(--line)}
pre{background:var(--linen2);border:1px solid var(--line);border-radius:10px;padding:18px 20px;overflow:auto;margin:18px 0;font-family:var(--mono);font-size:12.5px;line-height:1.5;color:var(--cocoa)}
pre code{background:none;border:none;padding:0;color:inherit;font-size:inherit}
blockquote{margin:18px 0;padding:13px 20px;background:var(--linen2);border-left:3px solid var(--wine);border-radius:0 8px 8px 0;color:var(--cocoa);font-size:13.5px;line-height:1.62}
blockquote code{background:#efe6d7}
ul,ol{margin:11px 0;padding-left:24px}li{margin:6px 0}
table{width:100%;border-collapse:collapse;margin:18px 0;font-size:13px;line-height:1.5;background:var(--linen2);border:1px solid var(--line);border-radius:8px;overflow:hidden}
thead th{background:var(--khaki);color:var(--espresso);font-family:var(--mono);font-weight:600;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;text-align:left;padding:9px 12px;border-bottom:1px solid var(--line2)}
tbody td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}
tbody tr:last-child td{border-bottom:none}tbody tr:nth-child(even){background:rgba(234,227,213,.34)}
td code,th code{font-size:.9em}
.eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--camel);margin-bottom:18px}
@media(max-width:720px){.doc{padding:34px 16px 80px}h1{font-size:34px}h2{font-size:25px}table{font-size:11.5px}thead th{font-size:9.5px}}
`;

const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SchooIOS — Playbook Warm · F1–F7</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${CSS}</style></head>
<body><main class="doc"><div class="eyebrow">SchooIOS · Design Vision · Warm Immersive Archive</div>
${out.join("\n")}
</main></body></html>`;

fs.writeFileSync(outPath, html, "utf8");
console.log("Wrote " + outPath + " (" + html.length + " bytes, " + out.length + " blocks)");

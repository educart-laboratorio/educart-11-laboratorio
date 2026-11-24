module.exports = function prepareDriveGallery(html) {
  if (html.includes('src="/assets/album-drive.js"')) return html;
  const render = /^function render\(\)\{const start=page\*perPage;gallery\.replaceChildren\(\);[^\n]+\n/m;
  if (!render.test(html)) throw new Error("A galeria editorial mudou e precisa ser conferida");
  return html
    .replace("</head>", '<script src="/assets/album-drive.js"></script></head>')
    .replace('aria-label="Álbuns do espetáculo">', 'aria-label="Álbuns do espetáculo"><a href="./acervo/">Ver todas as fotografias no portal</a>')
    .replace(/^<div class="veil"[^\n]+\n/m, "")
    .replace("let page=0,active=0,coverAlt=false,lastFocus=null;", "let page=0,coverAlt=false;")
    .replace(/^const veil=[^\n]+\n|^function (?:openView|closeView|step)\([^\n]+\n|^document\.getElementById\('close'\)[^\n]+\n/gm, "")
    .replace(render, () => 'function render(){\n'
      + 'const start=page*perPage;\n'
      + 'gallery.innerHTML=galleryPhotos.slice(start,start+perPage).map(p=>{\n'
      + 'const thumbnail=window.educartDriveAlbum.thumbnail(p.url_original,p.texto_alternativo,p.arquivo_derivado);\n'
      + 'return \'<article class="photo">\'+thumbnail+\'<span class="photocopy">\'+p.rotulo+\'<small>\'+p.arquivo_original+\' · Foto: Danilo Barretto</small></span></article>\';\n'
      + '}).join("");\n'
      + 'document.getElementById("prev").disabled=page===0;\n'
      + 'document.getElementById("next").disabled=page===1;\n'
      + 'document.getElementById("page-label").textContent=(page+1)+" / 2";\n'
      + 'document.getElementById("pagecount").textContent=(page+1)+" de 2";\n'
      + '}\n');
};

if (require.main === module) {
  const fs = require("node:fs");
  const path = require("node:path");
  const page = path.join(__dirname, "../espetaculos/o-homem-ajuda-o-homem/index.html");
  fs.writeFileSync(page, module.exports(fs.readFileSync(page, "utf8")), "utf8");
}

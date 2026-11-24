(function () {
  const encode = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  function fileId(original) {
    const match = /^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)\/view(?:[?#].*)?$/.exec(original ?? "");
    return match?.[1];
  }

  function thumbnail(original, label, fallback) {
    const id = fileId(original);
    if (!id) return "";
    const backup = fallback && /^\/(?!\/)/.test(fallback)
      ? ` data-album-fallback="${encode(fallback)}"` : "";
    const src = `https://drive.google.com/thumbnail?id=${id}&sz=w220`;
    return `<a class="drive-thumbnail" href="${encode(original)}" target="_blank" rel="noopener noreferrer" aria-label="${encode(label)} — abrir original no Drive"><img src="${encode(src)}" alt="${encode(label)}" loading="lazy" decoding="async"${backup}></a>`;
  }

  document.addEventListener("error", (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.closest(".drive-thumbnail")) return;
    if (img.dataset.albumFallback) {
      const fallback = img.dataset.albumFallback;
      delete img.dataset.albumFallback;
      img.src = fallback;
      return;
    }
    const link = img.closest(".drive-thumbnail");
    const message = document.createElement("span");
    message.className = "drive-thumbnail-unavailable";
    message.textContent = "Abrir original no Drive ↗";
    link.replaceChildren(message);
  }, true);

  window.educartDriveAlbum = Object.freeze({ fileId, thumbnail });
})();

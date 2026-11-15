/** Compression d'image côté client : plus grand côté 480 px, JPEG ~0,7. */
export async function compresserImage(fichier: File, max = 480, qualite = 0.7): Promise<string> {
  if (!fichier.type.startsWith('image/')) throw new Error('Ce fichier n’est pas une image.');
  const url = URL.createObjectURL(fichier);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Image illisible.'));
      i.src = url;
    });
    const ratio = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * ratio));
    const h = Math.max(1, Math.round(img.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Compression impossible sur cet appareil.');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', qualite);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const processImage = (file, maxSize, isSquare = false) => {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      reject(new Error("Only JPEG, PNG, and WebP images are allowed."));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (isSquare) {
          const minSize = Math.min(width, height);
          const startX = (width - minSize) / 2;
          const startY = (height - minSize) / 2;

          canvas.width = maxSize;
          canvas.height = maxSize;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, startX, startY, minSize, minSize, 0, 0, maxSize, maxSize);
        } else {
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height *= maxSize / width));
              width = maxSize;
            } else {
              width = Math.round((width *= maxSize / height));
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
        }

        const base64Data = canvas.toDataURL("image/jpeg", 0.7);

        // check size (approximate size of base64 in bytes)
        // size in bytes = (base64 string length) * (3/4)
        const sizeInBytes = base64Data.length * 0.75;
        if (sizeInBytes > 300 * 1024) {
          reject(new Error("Image is too large after compression (max 300KB)."));
        } else {
          resolve(base64Data);
        }
      };
      img.onerror = () => {
        reject(new Error("Failed to load image."));
      };
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file."));
    };
  });
};

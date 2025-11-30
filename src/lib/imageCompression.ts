import { logger } from "./productionLogger";

/**
 * Options de compression d'image
 */
interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 à 1.0
  maxSizeMB?: number;
}

/**
 * Compresse une image pour réduire sa taille avant upload
 * Utilise canvas pour le redimensionnement et la compression
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> => {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    maxSizeMB = 20,
  } = options;

  return new Promise((resolve, reject) => {
    // Vérifier la taille avant compression
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      reject(new Error(`L'image dépasse la taille maximale de ${maxSizeMB}MB`));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Calculer les nouvelles dimensions
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Créer un canvas pour le redimensionnement
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Impossible de créer le contexte canvas"));
            return;
          }

          // Dessiner l'image redimensionnée
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir en blob avec compression
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const originalSize = (file.size / 1024).toFixed(2);
                const compressedSize = (blob.size / 1024).toFixed(2);
                const reduction = (
                  ((file.size - blob.size) / file.size) *
                  100
                ).toFixed(1);

                logger.info("Image compressed", {
                  originalSize: `${originalSize}KB`,
                  compressedSize: `${compressedSize}KB`,
                  reduction: `${reduction}%`,
                });

                resolve(blob);
              } else {
                reject(new Error("Échec de la compression"));
              }
            },
            file.type,
            quality
          );
        } catch (error) {
          logger.error("Error during image compression", { error });
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Erreur lors du chargement de l'image"));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Erreur lors de la lecture du fichier"));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Valide le type MIME d'une image
 */
export const validateImageType = (file: File): boolean => {
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  return validTypes.includes(file.type);
};

/**
 * Valide la taille d'une image
 */
export const validateImageSize = (file: File, maxSizeMB: number = 20): boolean => {
  const fileSizeMB = file.size / (1024 * 1024);
  return fileSizeMB <= maxSizeMB;
};

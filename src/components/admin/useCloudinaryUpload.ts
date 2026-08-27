import { useState } from "react";
import { actions } from "astro:actions";

/**
 * Upload slike direktno na Cloudinary, potpisano.
 *
 * Fajl ne prolazi kroz naš server — samo potpis. Tako veliki uploadi ne
 * opterećuju Node proces, a API secret ostaje na serveru.
 */
export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File, target: "header" | "gallery"): Promise<string | null> {
    setUploading(true);
    setError(null);

    try {
      const { data: signed, error: signError } = await actions.uploads.signature({ target });

      if (signError || !signed) {
        setError("Nije moguće dobiti dozvolu za upload. Provjeri jesi li još prijavljen.");
        return null;
      }

      const body = new FormData();
      body.append("file", file);
      body.append("api_key", signed.apiKey);
      body.append("timestamp", String(signed.timestamp));
      body.append("folder", signed.folder);
      body.append("signature", signed.signature);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
        { method: "POST", body },
      );

      if (!response.ok) {
        setError("Cloudinary je odbio sliku. Provjeri format i veličinu.");
        return null;
      }

      const result = (await response.json()) as { public_id?: string };

      if (!result.public_id) {
        setError("Upload je prošao, ali Cloudinary nije vratio sliku.");
        return null;
      }

      return result.public_id;
    } catch {
      setError("Upload nije uspio. Provjeri internet konekciju.");
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading, error, clearError: () => setError(null) };
}

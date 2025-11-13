// Cloudflare Pages Function: POST /api/upload/photo
// Upload member photo to R2 and return public URL
import { z } from "zod";
import type { EventContext } from "../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError } from "../../lib/utils";
import { requireAuth } from "../../lib/auth";

const uploadPhotoSchema = z.object({
  base64Image: z.string().min(1, "Imagem é obrigatória"),
  fileName: z.string().optional(),
});

function base64ToBlob(base64: string): { blob: ArrayBuffer; contentType: string } {
  // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
  const matches = base64.match(/^data:([^;]+);base64,(.+)$/);
  
  if (!matches) {
    throw new Error("Invalid base64 format");
  }

  const contentType = matches[1];
  const base64Data = matches[2];
  
  // Decode base64 to binary
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return {
    blob: bytes.buffer,
    contentType,
  };
}

export async function onRequestPost(context: EventContext) {
  try {
    // Require authentication (admin or member)
    const authResult = await requireAuth(context, false);
    if ('error' in authResult) {
      return authResult.error;
    }

    const body = await parseBody(context.request);
    const validatedData = uploadPhotoSchema.parse(body);

    // Convert base64 to blob
    const { blob, contentType } = base64ToBlob(validatedData.base64Image);

    // Generate unique filename
    const userId = authResult.user.id;
    const timestamp = Date.now();
    const extension = contentType.split('/')[1] || 'jpg';
    const fileName = validatedData.fileName || `member-${userId}-${timestamp}.${extension}`;
    const key = `photos/${fileName}`;

    // Upload to R2
    await context.env.R2.put(key, blob, {
      httpMetadata: {
        contentType,
      },
    });

    // Generate public URL
    const publicUrl = `${context.env.R2_PUBLIC_URL}/${key}`;

    return jsonResponse({
      success: true,
      photoUrl: publicUrl,
      fileName: key,
    });
  } catch (error) {
    console.error("Upload photo error:", error);

    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }

    if (error instanceof Error && error.message.includes("Invalid base64")) {
      return errorResponse("Formato de imagem inválido", 400);
    }

    return handleError(error);
  }
}

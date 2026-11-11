import { z } from "zod";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { deviceScoped } from "../middleware/device";
import { publicUrl, s3 } from "../lib/s3";

export const upload = {
  presign: deviceScoped
    .input(
      z.object({
        filename: z.string().min(1).max(120),
        contentType: z.string().regex(/^image\//),
        kind: z.enum(["food", "avatar", "gallery"]).default("food"),
      }),
    )
    .handler(async ({ context, input }) => {
      const safe = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `${input.kind}/${context.deviceId}/${Date.now()}-${safe}`;

      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          ContentType: input.contentType,
          ACL: "public-read",
        }),
        { expiresIn: 600, signableHeaders: new Set(["x-amz-acl"]) },
      );

      return { url, key, publicUrl: publicUrl(key) };
    }),
};

const AWS = require("aws-sdk");

const attachmentDisposition = (filename) => {
  const safe = String(filename || "media").replace(/[\r\n"]/g, "");
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
};

const toForcedDownloadUrl = (fileUrl, filename) => {
  if (!fileUrl) return fileUrl;
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.S3_BUCKET_NAME) {
    return encodeURI(fileUrl);
  }

  try {
    const parsed = new URL(fileUrl);
    const key = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "us-east-1",
    });

    return s3.getSignedUrl("getObject", {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Expires: 60 * 60 * 24 * 7,
      ResponseContentDisposition: attachmentDisposition(filename),
    });
  } catch {
    return encodeURI(fileUrl);
  }
};

module.exports = { toForcedDownloadUrl };

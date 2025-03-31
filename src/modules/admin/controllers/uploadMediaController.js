const { S3, PutObjectCommand } = require('@aws-sdk/client-s3');


const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Function to upload a file to S3 using the v3 command interface
const uploadToS3 = async (file) => {
  const uniqueKey = `${Date.now()}-${file.originalname}`;
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: uniqueKey,            
    Body: file.buffer,         
    ContentType: file.mimetype,
  };

  const command = new PutObjectCommand(params);
  await s3.send(command);

  
  const link = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueKey}`;

  return {
    name: file.originalname, 
    size: file.size,         
    type: file.mimetype,     
    link: link               
  };
};


const uploadMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Upload all files to S3 in parallel
    const uploadedFiles = await Promise.all(req.files.map(uploadToS3));
    res.json(uploadedFiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { uploadMedia };

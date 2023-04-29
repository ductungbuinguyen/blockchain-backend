import AWS from 'aws-sdk'
import { generateRandomKey } from './contract';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
})

export const uploadToS3Bucket = async (
  base64Image: string,
) => {
  const fileName = `${generateRandomKey()}.jpeg`
  const buf = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ""),'base64')
  const result = await s3.upload({
    Bucket: process.env.AWS_BUCKET || "",
    Key: fileName,
    Body: buf,
    ContentEncoding: 'base64',
    ContentType: 'image/jpeg'
  }).promise();
  console.log('result', result);
  if(result) return `${process.env.URI_S3}/${fileName}`
  return ''
};
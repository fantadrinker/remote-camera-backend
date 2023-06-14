// gets upload url for a video
//
import { Handler } from 'aws-lambda'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const URL_EXPIRATION_SECONDS = 300
const s3Client = new S3Client({ region: process.env.AWS_REGION })

export const handler: Handler = event => {
  const { sub } = event.queryStringParameters
  const randomId = Math.random().toString(36).substring(2, 15)
  const Key = `${sub}/${randomId}`

  const getCommand = new PutObjectCommand({
    Bucket: process.env.RECORDINGS_BUCKET,
    Key,
  })

  return getSignedUrl(
    s3Client, 
    getCommand, 
    { expiresIn: URL_EXPIRATION_SECONDS }).then(url => {
      return JSON.stringify({
        uploadUrl: url,
        Key,
      })
    }
  )
}

// gets a list of all s3 objects for a given user
//
import { Handler } from 'aws-lambda'
import { S3Client, ListObjectsCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({ region: process.env.AWS_REGION })

export const handler: Handler = event => {
  const { sub } = event.queryStringParameters
  const Prefix = `${sub}/`

  const listCommand = new ListObjectsCommand({
    Bucket: process.env.RECORDINGS_BUCKET,
    Prefix,
  })

  return s3Client.send(listCommand).then(data => {
    return JSON.stringify({
      success: true,
      data: data.Contents?.map(object => {
        return {
          Key: object.Key,
          LastModified: object.LastModified,
          Size: object.Size,
        }
      }),
    })
  })
}



output "storage_bucket_name" {
  value = aws_s3_bucket.storage_bucket.id
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.storage_api.api_endpoint
}

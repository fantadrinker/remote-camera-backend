# storage module, consists of one s3 bucket and a api gateway

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }

    auth0 = {
      source = "auth0/auth0"
      version = "~> 0.47"
    }
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region = "us-east-1"
}

provider "auth0" {} # grab from environment

resource "auth0_resource_server" "storage_api" {
  name = "remote-cam-storage-api"
  identifier = aws_apigatewayv2_api.storage_api.api_endpoint
  signing_alg = "RS256"
  allow_offline_access = true
  token_lifetime = 86400
  skip_consent_for_verifiable_first_party_clients = true
}

resource "aws_apigatewayv2_api" "storage_api" {
  name = "storage-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_headers = ["*"]
    allow_methods = ["*"]
    allow_origins = var.webapp_origins
    max_age = 300
  }
}

resource "aws_apigatewayv2_stage" "default_stage" {
  api_id = aws_apigatewayv2_api.storage_api.id
  name = "storage-api-stage"
  auto_deploy = true
}

resource "aws_apigatewayv2_authorizer" "token_auth" {
  name = "token-auth"
  api_id = aws_apigatewayv2_api.storage_api.id
  authorizer_type = "JWT"
  identity_sources = [ "$request.header.Authorization" ]
  jwt_configuration {
    audience = [aws_apigatewayv2_api.storage_api.api_endpoint]
    issuer = var.auth0_domain
  }
}

resource "aws_s3_bucket" "storage_bucket" {}

resource "aws_s3_bucket_cors_configuration" "allow_web" {
  bucket = aws_s3_bucket.storage_bucket.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "DELETE", "HEAD"]
    allowed_origins = var.webapp_origins
    max_age_seconds = 3000
  }
}

module "lambda_routes" {
  source = "./lambdas"
  recordings_bucket = aws_s3_bucket.storage_bucket.id
  http_api_id = aws_apigatewayv2_api.storage_api.id
  http_api_exe_arn = aws_apigatewayv2_api.storage_api.execution_arn
}

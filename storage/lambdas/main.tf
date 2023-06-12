terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.2"
    }
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_iam_role" "lambda_api_route_role" {
  name = "lambda-api-route-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Sid    = ""
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

locals {
  route_key_fun_map = {
    "GET /access-url" = "getUploadUrl",
    "GET /recordings" = "getS3Objects",
    "GET /download-url" = "getDownloadUrl"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_api_route_role_attachment" {
  role       = aws_iam_role.lambda_api_route_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "s3_access" {
  role       = aws_iam_role.lambda_api_route_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

data "archive_file" "lambda_zip" {
  for_each = local.route_key_fun_map

  type        = "zip"
  source_dir  = "${path.module}/dist/${each.value}"
  output_path = "${path.module}/dist/${each.value}.zip"
}

resource "aws_lambda_function" "api_route" {
  for_each = local.route_key_fun_map

  function_name = "${each.value}"
  role          = aws_iam_role.lambda_api_route_role.arn
  handler       = "app.handler"
  runtime       = "nodejs18.x"
  filename      = data.archive_file.lambda_zip[each.key].output_path
  source_code_hash = data.archive_file.lambda_zip[each.key].output_base64sha256
  timeout       = 10
  memory_size   = 128

  environment {
    variables = {
      RECORDINGS_BUCKET = var.recordings_bucket    
    }
  }
}

resource "aws_lambda_permission" "apigw" {
  for_each = local.route_key_fun_map

  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_route[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.http_api_exe_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "route_fun_integration" {
  for_each = local.route_key_fun_map

  api_id = var.http_api_id
  integration_type = "AWS_PROXY"
  integration_method = "POST"
  integration_uri = aws_lambda_function.api_route[each.key].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "route" {
  for_each = local.route_key_fun_map

  api_id = var.http_api_id
  route_key = each.key
  target = "integrations/${aws_apigatewayv2_integration.route_fun_integration[each.key].id}"
}


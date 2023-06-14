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

locals {
  route_key_fun_map = {
    "$default" = "default",
    "$connect" = "connect",
    "$disconnect" = "disconnect"
    "viewerinit" = "viewerinit"
    "viewersend" = "viewersend"
    "broadcastinit" = "broadcastinit"
    "broadcastsend" = "broadcastsend"
  }
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

resource "aws_iam_role_policy_attachment" "lambda_api_route_role_attachment" {
  role       = aws_iam_role.lambda_api_route_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "s3_access" {
  role       = aws_iam_role.lambda_api_route_role.name
  policy_arn = "arn:aws:iam::aws:policy/DynamoDBFullAccess"
}

data "archive_file" "lambda_zip" {
  for_each = local.route_key_fun_map

  type        = "zip"
  source_dir  = "${path.module}/dist/${each.value}"
  output_path = "${path.module}/dist/${each.value}.zip"
}

resource "aws_lambda_function" "lambda" {
  for_each = local.route_key_fun_map

  function_name = "${each.value}-lambda"
  role = aws_iam_role.lambda_api_route_role.arn
  handler = "app.handler"
  runtime = "nodejs18.x"
  filename = data.archive_file.lambda_zip[each.key].output_path
  source_code_hash = data.archive_file.lambda_zip[each.key].output_base64sha256
}

resource "aws_apigatewayv2_deployment" "deployment" {
  api_id = var.api_id
  description = "Deployment"
  triggers = {
    redeployment = sha1(jsonencode({
      route_key_fun_map = local.route_key_fun_map,
      lambda_zip = data.archive_file.lambda_zip,
    }))
  }
}

resource "aws_apigatewayv2_route" "websocket_routes" {
  for_each = local.route_key_fun_map
  
  api_id = var.api_id
  route_key = each.key
  target = "integrations/${aws_apigatewayv2_integration.ws_integrations[each.key].id}"
}

resource "aws_apigatewayv2_integration" "ws_integrations" {
  for_each = local.route_key_fun_map
  
  api_id = var.api_id
  integration_type = "AWS_PROXY"
  integration_method = "POST"
  integration_uri = aws_lambda_function.lambda[each.key].invoke_arn
  payload_format_version = "2.0"
}



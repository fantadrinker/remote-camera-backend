terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "~> 4.16"
    }

    auth0 = {
      source = "auth0/auth0"
      version = "~> 0.47"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

provider "auth0" {}

module "lambdas" {
  source = "./lambdas"
  api_id = aws_apigatewayv2_api.api.id
  api_exe_arn = aws_apigatewayv2_api.api.execution_arn
  stream_table_name = aws_dynamodb_table.stream_table.name
}

resource "auth0_resource_server" "api" {
  name = "streaming-api"
  identifier = aws_apigatewayv2_api.api.api_endpoint
}

resource "aws_apigatewayv2_api" "api" {
  name = "streaming_api"
  protocol_type = "WEBSOCKET"
  route_selection_expression = "$request.body.action" 
}

resource "aws_apigatewayv2_stage" "dev" {
  api_id = aws_apigatewayv2_api.api.id
  name = "dev"
  auto_deploy = true
}

resource "aws_dynamodb_table" "stream_table" {
  name = "stream_table"
  billing_mode = "PROVISIONED"
  read_capacity = 5
  write_capacity = 5
  hash_key = "pk"
  attribute {
    name = "pk"
    type = "S"
  }
}

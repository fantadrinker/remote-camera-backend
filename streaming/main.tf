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

resource "aws_apigatewayv2_stage" "default" {
  api_id = aws_apigatewayv2_api.api.id
  name = "$default"
  auto_deploy = true
}


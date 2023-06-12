variable "auth0_domain" {
  type = string
}

variable "webapp_origins" {
  type = list(string)
  default = ["*"]
}


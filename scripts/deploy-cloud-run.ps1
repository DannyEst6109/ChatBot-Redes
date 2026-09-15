param(
  [string]$ProjectId = (gcloud config get-value project),
  [string]$Region = 'us-central1',
  [string]$ServiceName = 'supply-control-mcp'
)

$ErrorActionPreference = 'Stop'

if (-not $env:MCP_API_KEY) {
  throw 'Set MCP_API_KEY to a long random value before deploying.'
}
if (-not $ProjectId -or $ProjectId -eq '(unset)') {
  throw 'Pass -ProjectId or configure a gcloud project.'
}

gcloud auth print-access-token | Out-Null
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project $ProjectId
gcloud run deploy $ServiceName `
  --source . `
  --project $ProjectId `
  --region $Region `
  --allow-unauthenticated `
  --max-instances 1 `
  --set-env-vars "MCP_API_KEY=$($env:MCP_API_KEY)" `
  --quiet

$serviceUrl = gcloud run services describe $ServiceName --project $ProjectId --region $Region --format 'value(status.url)'
Write-Output "SUPPLY_REMOTE_URL=$serviceUrl/mcp"
Write-Output 'SUPPLY_REMOTE_API_KEY=<the same value as MCP_API_KEY>'

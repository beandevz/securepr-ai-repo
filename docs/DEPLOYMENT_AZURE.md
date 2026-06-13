# Azure Deployment Guide

Deploy SecurePR AI to Azure using Container Apps, Service Bus, and Azure OpenAI.

## 🏗️ Architecture

```
Internet → Azure Front Door → Container App → Service Bus → Worker Containers
                                    ↓
                              Azure OpenAI
                              Azure Storage (RAG DB)
                              Azure Monitor
```

## 📋 Prerequisites

- Azure CLI installed
- Azure subscription
- Terraform 1.5+ (optional)
- Docker
- Azure OpenAI resource provisioned

## 🚀 Quick Deploy (Terraform)

### 1. Configure Variables

```bash
cd deployment/azure
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
resource_group_name = "securepr-ai-rg"
location            = "eastus"
environment         = "prod"

# Azure OpenAI
azure_openai_endpoint    = "https://your-openai.openai.azure.com"
azure_openai_deployment  = "gpt-4"
azure_openai_embedding   = "text-embedding-ada-002"

# GitHub
github_token            = "ghp_your_token"
securepr_ingest_secret  = "your-random-secret-here"
```

### 2. Deploy Infrastructure

```bash
terraform init
terraform plan
terraform apply
```

Resources created:
- Azure Container Apps (API + Worker)
- Azure Service Bus (Queue)
- Azure Storage Account (RAG database)
- Azure Container Registry
- Azure Monitor + Log Analytics
- Azure Front Door (optional)

### 3. Deploy Application

```bash
# Build and push containers
az acr build --registry YOUR_ACR_NAME \
  --image securepr-api:latest \
  --file deployment/azure/Dockerfile.api .

az acr build --registry YOUR_ACR_NAME \
  --image securepr-worker:latest \
  --file deployment/azure/Dockerfile.worker .

# Update container apps
az containerapp update \
  --name securepr-api \
  --resource-group securepr-ai-rg \
  --image YOUR_ACR_NAME.azurecr.io/securepr-api:latest

az containerapp update \
  --name securepr-worker \
  --resource-group securepr-ai-rg \
  --image YOUR_ACR_NAME.azurecr.io/securepr-worker:latest
```

## 🔧 Manual Deployment

### Step 1: Create Resource Group

```bash
az group create \
  --name securepr-ai-rg \
  --location eastus
```

### Step 2: Create Azure Container Registry

```bash
az acr create \
  --resource-group securepr-ai-rg \
  --name securepracr \
  --sku Basic
```

### Step 3: Create Service Bus

```bash
az servicebus namespace create \
  --resource-group securepr-ai-rg \
  --name securepr-bus \
  --location eastus \
  --sku Standard

az servicebus queue create \
  --resource-group securepr-ai-rg \
  --namespace-name securepr-bus \
  --name securepr-queue
```

### Step 4: Create Container Apps Environment

```bash
az containerapp env create \
  --name securepr-env \
  --resource-group securepr-ai-rg \
  --location eastus
```

### Step 5: Deploy API Container

```bash
# Build image
docker build -t securepracr.azurecr.io/securepr-api:latest -f deployment/azure/Dockerfile.api .

# Push to ACR
az acr login --name securepracr
docker push securepracr.azurecr.io/securepr-api:latest

# Create container app
az containerapp create \
  --name securepr-api \
  --resource-group securepr-ai-rg \
  --environment securepr-env \
  --image securepracr.azurecr.io/securepr-api:latest \
  --target-port 8000 \
  --ingress external \
  --env-vars \
    AZURE_OPENAI_ENDPOINT=secretref:openai-endpoint \
    AZURE_OPENAI_KEY=secretref:openai-key \
    SERVICEBUS_CONNECTION_STRING=secretref:servicebus-conn \
    QUEUE_PROVIDER=azure_servicebus
```

### Step 6: Deploy Worker Container

```bash
az containerapp create \
  --name securepr-worker \
  --resource-group securepr-ai-rg \
  --environment securepr-env \
  --image securepracr.azurecr.io/securepr-worker:latest \
  --min-replicas 1 \
  --max-replicas 10 \
  --env-vars \
    AZURE_OPENAI_ENDPOINT=secretref:openai-endpoint \
    AZURE_OPENAI_KEY=secretref:openai-key \
    SERVICEBUS_CONNECTION_STRING=secretref:servicebus-conn
```

## 🔐 Configure Secrets

```bash
az containerapp secret set \
  --name securepr-api \
  --resource-group securepr-ai-rg \
  --secrets \
    openai-endpoint=YOUR_ENDPOINT \
    openai-key=YOUR_KEY \
    servicebus-conn=YOUR_CONNECTION_STRING \
    github-token=YOUR_GITHUB_TOKEN
```

## 📊 Monitoring & Logging

### Application Insights

```bash
az monitor app-insights component create \
  --app securepr-insights \
  --location eastus \
  --resource-group securepr-ai-rg
```

Update container apps to use App Insights:
```bash
az containerapp update \
  --name securepr-api \
  --resource-group securepr-ai-rg \
  --set-env-vars \
    APPLICATIONINSIGHTS_CONNECTION_STRING=YOUR_CONN_STRING
```

### View Logs

```bash
# Stream logs
az containerapp logs show \
  --name securepr-api \
  --resource-group securepr-ai-rg \
  --follow

# Query logs
az monitor log-analytics query \
  --workspace YOUR_WORKSPACE_ID \
  --analytics-query "ContainerAppConsoleLogs_CL | where TimeGenerated > ago(1h)"
```

## 🔄 CI/CD with GitHub Actions

See `.github/workflows/deploy-azure.yml` for automated deployment.

Secrets to configure in GitHub:
- `AZURE_CREDENTIALS` - Service principal JSON
- `AZURE_OPENAI_KEY` - Azure OpenAI key
- `GITHUB_TOKEN` - GitHub personal access token
- `SECUREPR_INGEST_SECRET` - Webhook signature secret

## 💰 Cost Optimization

**Estimated Monthly Cost**:
- Container Apps: $50-200 (depending on scale)
- Service Bus: $10-50
- Azure OpenAI: $100-500 (pay-per-token)
- Storage: $5
- **Total**: ~$165-755/month

**Cost Reduction Tips**:
1. Use consumption plan for Container Apps
2. Set min replicas to 0 for worker (scale from zero)
3. Use reserved capacity for Azure OpenAI
4. Enable autoscaling based on queue depth
5. Use Azure Dev/Test pricing

## 🔍 Troubleshooting

### Container App won't start

```bash
# Check logs
az containerapp logs show --name securepr-api --resource-group securepr-ai-rg

# Check revisions
az containerapp revision list --name securepr-api --resource-group securepr-ai-rg

# Describe container app
az containerapp show --name securepr-api --resource-group securepr-ai-rg
```

### Service Bus connection issues

```bash
# Test connection string
az servicebus namespace authorization-rule keys list \
  --resource-group securepr-ai-rg \
  --namespace-name securepr-bus \
  --name RootManageSharedAccessKey
```

### OpenAI API errors

- Check deployment name matches configuration
- Verify API key is valid
- Check quota limits in Azure portal
- Review throttling policies

## 📚 Additional Resources

- [Azure Container Apps Documentation](https://docs.microsoft.com/azure/container-apps/)
- [Azure Service Bus Documentation](https://docs.microsoft.com/azure/service-bus-messaging/)
- [Azure OpenAI Service](https://docs.microsoft.com/azure/cognitive-services/openai/)

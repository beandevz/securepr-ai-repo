# Azure Deployment Guide

> **Deploying to App Service? Use the combined image.**
> `deployment/docker/Dockerfile.combined` packages nginx (serving the SPA
> and proxying `/api/` to `127.0.0.1:8000`) together with the Node API in
> one container. Frontend and API are same-origin, so there is **no API
> URL to configure** — no build-arg, no runtime setting, no CORS — and you
> deploy a single Web App instead of two. See
> [Single-container deployment](#-single-container-deployment-app-service)
> below. The rest of this guide covers the split two-container setup.

Deploy SecurePR AI to Azure using Container Apps.

This matches the app's actual current architecture: a single API container
that serves HTTP *and* runs the job queue in-process (see
`backend/src/queue/manager.ts` — `InProcQueue`), plus a static frontend
container. There is no Service Bus queue or worker container in this
codebase today — `ServiceBusQueue` (`backend/src/queue/manager.ts`) is an
unimplemented stub whose `enqueue()` just throws. Don't set
`QUEUE_PROVIDER=azure_servicebus` in production; it will break job ingestion.

## 🏗️ Architecture

```
Internet → API Container App (HTTP + in-process job queue)
                ↓
          Azure Files (persists rag.db / repos.db / jobs.db)
                ↓
          Azure OpenAI / OpenAI-compatible endpoint

Internet → Frontend Container App (static build, calls API directly via CORS)
```

The frontend calls the API's public HTTPS URL directly (CORS is open in
`backend/src/main.ts`) — no reverse proxy is needed in Azure. The nginx
`/api/` proxy in `deployment/docker/nginx.conf` only matters for local
`docker-compose` use, where frontend and API share a Docker network.

**Single API replica only.** The job queue is in-memory
(`InProcQueue`) and the data stores are sql.js (SQLite-via-WASM) files on
disk — neither is safe for concurrent multi-replica access. Keep
`minReplicas`/`maxReplicas` at 1 for the API app unless the queue and
storage layers are replaced with real shared services.

## 📦 Single-container deployment (App Service)

One image, one Web App. Because the SPA and the API share an origin,
nothing needs to know the API's URL.

### 1. Build and push

```bash
RG=securepr-ai-rg
ACR_NAME=<your-acr-name>

az acr build --registry $ACR_NAME \
  --image securepr:latest \
  --file deployment/docker/Dockerfile.combined .
```

### 2. Create the Web App

Portal → **App Services → + Create → Web App**:
- **Publish**: Container, **Operating System**: Linux
- **Container** tab → Image Source: Azure Container Registry, Image:
  `securepr`, Tag: `latest`

### 3. Application settings

Web App → **Settings → Configuration → Application settings**:

| Name | Value |
|---|---|
| `WEBSITES_PORT` | `80` |
| `GITHUB_TOKEN` | your GitHub token |
| `SECUREPR_INGEST_SECRET` | your webhook secret |
| `RAG_DB_PATH` | `/home/data/rag.db` |
| `REPOS_DB_PATH` | `/home/data/repos.db` |
| `JOBS_DB_PATH` | `/home/data/jobs.db` |
| `LLM_PROVIDER` | `openai` (or omit for rule-based analysis only) |
| `OPENAI_API_KEY` | your key (omit if no LLM) |
| `OPENAI_BASE_URL` | your Azure OpenAI endpoint (omit for public OpenAI) |
| `OPENAI_MODEL` | your deployment/model name |

The `/home` paths matter: Linux App Service persists `/home` across
restarts, and without them the sql.js databases are wiped on every
restart or redeploy. `QUEUE_PROVIDER=inproc` is already baked into the
image.

### 4. Verify

- `https://<app>.azurewebsites.net` — the SPA loads
- `https://<app>.azurewebsites.net/api/health` — returns `{"status":"ok"}`

Then point your GitHub webhook at
`https://<app>.azurewebsites.net/api/ingest/github-actions`, using the
same secret as `SECUREPR_INGEST_SECRET`.

Keep this app at a single instance — the in-process queue and sql.js file
stores are not safe for concurrent instances.

---

## 📋 Prerequisites

- Azure CLI (`az`) installed, with the `containerapp` extension
- Azure subscription
- Docker (only needed if you want to build locally instead of `az acr build`)
- An OpenAI-compatible endpoint if you want LLM-based analysis — either
  public OpenAI or an Azure OpenAI resource (see [LLM provider config](#-llm-provider-config))

There is no Terraform/Bicep in this repo (`deployment/` only contains
`deployment/docker/`) — deployment below is plain `az` CLI.

## 🚀 Deploy

### 1. Login and set variables

```bash
az login
az account set --subscription "<your-subscription-id>"

RG=securepr-ai-rg
LOCATION=eastus
ACR_NAME=securepracr$RANDOM          # must be globally unique
ENV_NAME=securepr-env
STORAGE_ACCOUNT=secureprstore$RANDOM # must be globally unique, lowercase
FILE_SHARE=securepr-data
```

### 2. Resource group + Azure Container Registry

```bash
az group create --name $RG --location $LOCATION

az acr create --resource-group $RG --name $ACR_NAME --sku Basic
```

### 3. Container Apps environment

```bash
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App

az containerapp env create \
  --name $ENV_NAME \
  --resource-group $RG \
  --location $LOCATION
```

### 4. Persistent storage for the sql.js DB files

Container Apps have ephemeral disks. Without this, `rag.db`, `repos.db`,
and `jobs.db` (see `backend/src/core/settings.ts` — `ragDbPath`,
`reposDbPath`, `jobsDbPath`) get wiped on every restart, redeploy, or scale
event.

```bash
az storage account create \
  --name $STORAGE_ACCOUNT --resource-group $RG \
  --location $LOCATION --sku Standard_LRS --kind StorageV2

STORAGE_KEY=$(az storage account keys list \
  --account-name $STORAGE_ACCOUNT --resource-group $RG \
  --query "[0].value" -o tsv)

az storage share-rm create \
  --storage-account $STORAGE_ACCOUNT --resource-group $RG \
  --name $FILE_SHARE --quota 5

az containerapp env storage set \
  --name $ENV_NAME --resource-group $RG \
  --storage-name securepr-data \
  --azure-file-account-name $STORAGE_ACCOUNT \
  --azure-file-account-key "$STORAGE_KEY" \
  --azure-file-share-name $FILE_SHARE \
  --access-mode ReadWrite
```

### 5. Build and push the API image

Build context is the repo root (`deployment/docker/Dockerfile.api` COPYs
from `backend/`):

```bash
az acr build --registry $ACR_NAME \
  --image securepr-api:latest \
  --file deployment/docker/Dockerfile.api .
```

### 6. Deploy the API container app

Volume mounts aren't a plain `az containerapp create` flag — they need a
YAML spec:

```bash
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)

cat > /tmp/api-containerapp.yaml <<EOF
properties:
  managedEnvironmentId: $(az containerapp env show --name $ENV_NAME --resource-group $RG --query id -o tsv)
  configuration:
    ingress:
      external: true
      targetPort: 8000
    registries:
      - server: $ACR_LOGIN_SERVER
        identity: system
    secrets:
      - name: openai-api-key
        value: "<your-openai-or-azure-openai-key>"
      - name: github-token
        value: "<your-github-token>"
      - name: ingest-secret
        value: "<your-webhook-secret>"
  template:
    containers:
      - image: $ACR_LOGIN_SERVER/securepr-api:latest
        name: securepr-api
        env:
          - name: QUEUE_PROVIDER
            value: inproc
          - name: LLM_PROVIDER
            value: openai
          - name: OPENAI_API_KEY
            secretRef: openai-api-key
          - name: OPENAI_BASE_URL
            value: "<your-azure-openai-endpoint-or-blank-for-public-openai>"
          - name: OPENAI_MODEL
            value: "<your-deployment-or-model-name>"
          - name: GITHUB_TOKEN
            secretRef: github-token
          - name: SECUREPR_INGEST_SECRET
            secretRef: ingest-secret
          - name: RAG_DB_PATH
            value: /data/rag.db
          - name: REPOS_DB_PATH
            value: /data/repos.db
          - name: JOBS_DB_PATH
            value: /data/jobs.db
        volumeMounts:
          - volumeName: securepr-data
            mountPath: /data
    volumes:
      - name: securepr-data
        storageType: AzureFile
        storageName: securepr-data
    scale:
      minReplicas: 1
      maxReplicas: 1
EOF

az acr login --name $ACR_NAME
az containerapp create --name securepr-api --resource-group $RG --yaml /tmp/api-containerapp.yaml
```

`LLM_PROVIDER=none` (the app default) is a safe starting point if you don't
want to wire up an LLM yet — the app still runs with the rule-based
analyzer only. Omit the `OPENAI_*` env vars/secrets in that case.

### 7. Build the frontend against the deployed API

`VITE_API_BASE_URL` is baked into the frontend bundle at *build time*, so
the API must exist first:

```bash
API_FQDN=$(az containerapp show --name securepr-api --resource-group $RG \
  --query properties.configuration.ingress.fqdn -o tsv)
echo "API is at https://$API_FQDN"

az acr build --registry $ACR_NAME \
  --image securepr-frontend:latest \
  --file deployment/docker/Dockerfile.frontend \
  --build-arg VITE_API_BASE_URL=https://$API_FQDN \
  .
```

### 8. Deploy the frontend container app

```bash
az containerapp create \
  --name securepr-frontend \
  --resource-group $RG \
  --environment $ENV_NAME \
  --image $ACR_LOGIN_SERVER/securepr-frontend:latest \
  --target-port 80 \
  --ingress external \
  --registry-server $ACR_LOGIN_SERVER
```

### 9. Wire up GitHub

Point your repo's webhook at `https://$API_FQDN/ingest/github-actions`,
using the same secret you set for `SECUREPR_INGEST_SECRET`.

## 🔑 LLM provider config

The app's LLM client (`backend/src/integrations/ai/openai-client.ts`) is a
generic OpenAI-compatible client — it only reads `OPENAI_API_KEY`,
`OPENAI_BASE_URL`, `OPENAI_MODEL`, and `OPENAI_EMBEDDING_MODEL`
(`backend/src/core/settings.ts`). There is no separate Azure OpenAI SDK
path, and `AZURE_OPENAI_*` env vars are **not read anywhere** in the
code — using them (e.g. as seen in `docker-compose.yml`) silently does
nothing.

To point at an Azure OpenAI resource, use the standard vars:
- `OPENAI_BASE_URL` — your Azure OpenAI resource's endpoint
- `OPENAI_API_KEY` — your Azure OpenAI key
- `OPENAI_MODEL` — your deployment name

## 📊 Monitoring & Logging

### Application Insights (optional)

```bash
az monitor app-insights component create \
  --app securepr-insights \
  --location $LOCATION \
  --resource-group $RG
```

There's no `APPLICATIONINSIGHTS_CONNECTION_STRING` handling in the
backend today — wiring this up would need actual instrumentation code
added first (e.g. `applicationinsights` npm package in `main.ts`).

### View logs

```bash
# Stream logs
az containerapp logs show \
  --name securepr-api \
  --resource-group $RG \
  --follow

# Query logs
az monitor log-analytics query \
  --workspace YOUR_WORKSPACE_ID \
  --analytics-query "ContainerAppConsoleLogs_CL | where TimeGenerated > ago(1h)"
```

## 🔄 CI/CD

There is no GitHub Actions workflow in this repo yet
(`.github/workflows/` doesn't exist). Deployment today is the manual `az`
steps above; automating them into a workflow is a future addition, not
something to assume is already configured.

## 💰 Cost Optimization

**Estimated Monthly Cost** (single-replica API + frontend, no Service Bus):
- Container Apps: $30-80 (2 apps, low/consumption scale)
- Azure Files: ~$1-5 (a few GB)
- Azure OpenAI / OpenAI: $100-500 (pay-per-token, depends on PR volume)
- **Total**: ~$130-580/month

**Cost Reduction Tips**:
1. Use consumption plan for both Container Apps
2. Scale the frontend to zero when idle (`--min-replicas 0`) — the API
   should stay at `minReplicas 1` since sql.js state loads from disk on
   startup and the in-process queue only runs while the process is alive
3. Use reserved capacity for Azure OpenAI if usage is steady

## 🔍 Troubleshooting

### Container App won't start

```bash
# Check logs
az containerapp logs show --name securepr-api --resource-group $RG

# Check revisions
az containerapp revision list --name securepr-api --resource-group $RG

# Describe container app
az containerapp show --name securepr-api --resource-group $RG
```

### Frontend can't reach the API

- Confirm the frontend was built with `--build-arg VITE_API_BASE_URL=https://<api-fqdn>` —
  this is baked in at build time, so a rebuild (not just a redeploy) is
  needed if the API's URL ever changes.
- Confirm the API's CORS is still open (`cors()` in `backend/src/main.ts`)
  or, if it's later locked down to specific origins, that the frontend's
  origin is included.

### OpenAI / Azure OpenAI errors

- Confirm you're using `OPENAI_*` env vars, not `AZURE_OPENAI_*` (see
  [LLM provider config](#-llm-provider-config))
- Check deployment/model name matches `OPENAI_MODEL`
- Verify the API key is valid and has quota

## 📚 Additional Resources

- [Azure Container Apps Documentation](https://docs.microsoft.com/azure/container-apps/)
- [Azure OpenAI Service](https://docs.microsoft.com/azure/cognitive-services/openai/)

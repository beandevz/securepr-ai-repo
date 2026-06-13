# AWS Deployment Guide

Deploy SecurePR AI to AWS using ECS Fargate, SQS, and Bedrock/OpenAI.

## 🏗️ Architecture

```
Internet → ALB → ECS Fargate (API) → SQS → ECS Fargate (Worker)
                        ↓
                  AWS Bedrock / OpenAI
                  S3 (RAG DB backup)
                  CloudWatch
```

## 📋 Prerequisites

- AWS CLI configured
- AWS account with appropriate permissions
- Terraform 1.5+ (optional)
- Docker
- ECR repository access

## 🚀 Quick Deploy (Terraform)

### 1. Configure Variables

```bash
cd deployment/aws
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
region              = "us-east-1"
environment         = "prod"
vpc_cidr            = "10.0.0.0/16"

# OpenAI / Bedrock
llm_provider        = "bedrock"  # or "openai"
openai_api_key      = "sk-..."  # if using OpenAI
bedrock_model_id    = "anthropic.claude-3-sonnet"  # if using Bedrock

# GitHub
github_token            = "ghp_your_token"
securepr_ingest_secret  = "your-random-secret"

# Scaling
api_desired_count       = 2
worker_desired_count    = 1
worker_max_count        = 10
```

### 2. Deploy Infrastructure

```bash
terraform init
terraform plan
terraform apply
```

Resources created:
- VPC with public/private subnets
- ECS Cluster
- ECR Repositories
- Application Load Balancer
- SQS Queue
- S3 Bucket (RAG storage)
- CloudWatch Log Groups
- IAM Roles and Policies
- Security Groups

### 3. Deploy Application

```bash
# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Build and push API
docker build -t securepr-api:latest -f deployment/aws/Dockerfile.api .
docker tag securepr-api:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/securepr-api:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/securepr-api:latest

# Build and push Worker
docker build -t securepr-worker:latest -f deployment/aws/Dockerfile.worker .
docker tag securepr-worker:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/securepr-worker:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/securepr-worker:latest

# Update ECS services
aws ecs update-service \
  --cluster securepr-cluster \
  --service securepr-api \
  --force-new-deployment

aws ecs update-service \
  --cluster securepr-cluster \
  --service securepr-worker \
  --force-new-deployment
```

## 🔧 Manual Deployment

### Step 1: Create VPC and Networking

```bash
# Create VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=securepr-vpc}]'

# Create subnets
aws ec2 create-subnet \
  --vpc-id vpc-xxx \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a

aws ec2 create-subnet \
  --vpc-id vpc-xxx \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b
```

### Step 2: Create ECR Repositories

```bash
aws ecr create-repository \
  --repository-name securepr-api \
  --region us-east-1

aws ecr create-repository \
  --repository-name securepr-worker \
  --region us-east-1
```

### Step 3: Create SQS Queue

```bash
aws sqs create-queue \
  --queue-name securepr-queue \
  --attributes VisibilityTimeout=300,MessageRetentionPeriod=86400
```

### Step 4: Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name securepr-cluster \
  --capacity-providers FARGATE FARGATE_SPOT
```

### Step 5: Create Task Definitions

**API Task Definition**:
```json
{
  "family": "securepr-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "securepr-api",
      "image": "YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/securepr-api:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "QUEUE_PROVIDER",
          "value": "sqs"
        },
        {
          "name": "SQS_QUEUE_URL",
          "value": "https://sqs.us-east-1.amazonaws.com/ACCOUNT/securepr-queue"
        }
      ],
      "secrets": [
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:securepr/openai-key"
        },
        {
          "name": "GITHUB_TOKEN",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:securepr/github-token"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/securepr-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Register task definition:
```bash
aws ecs register-task-definition \
  --cli-input-json file://api-task-definition.json
```

### Step 6: Create ECS Services

```bash
aws ecs create-service \
  --cluster securepr-cluster \
  --service-name securepr-api \
  --task-definition securepr-api:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=securepr-api,containerPort=8000"
```

### Step 7: Create Application Load Balancer

```bash
aws elbv2 create-load-balancer \
  --name securepr-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

aws elbv2 create-target-group \
  --name securepr-api-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id vpc-xxx \
  --target-type ip

aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

## 🤖 Using AWS Bedrock (Claude)

### Enable Bedrock Model Access

1. Go to AWS Console → Bedrock → Model access
2. Request access to: `anthropic.claude-3-sonnet-20240229-v1:0`
3. Wait for approval (usually instant)

### Configure in Application

```bash
# Update environment variables
LLM_PROVIDER=bedrock
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

### IAM Permissions

Add to ECS task role:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
    }
  ]
}
```

## 🔐 Secrets Management

Store secrets in AWS Secrets Manager:

```bash
# Store OpenAI key
aws secretsmanager create-secret \
  --name securepr/openai-key \
  --secret-string "sk-your-key-here"

# Store GitHub token
aws secretsmanager create-secret \
  --name securepr/github-token \
  --secret-string "ghp_your-token-here"

# Store webhook secret
aws secretsmanager create-secret \
  --name securepr/ingest-secret \
  --secret-string "your-random-secret"
```

## 📊 Monitoring & Logging

### CloudWatch Dashboards

```bash
# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name SecurePR \
  --dashboard-body file://cloudwatch-dashboard.json
```

### Alarms

```bash
# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name securepr-high-errors \
  --alarm-description "Alert on high error rate" \
  --metric-name Errors \
  --namespace AWS/ECS \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

### View Logs

```bash
# Stream logs
aws logs tail /ecs/securepr-api --follow

# Query logs
aws logs filter-log-events \
  --log-group-name /ecs/securepr-api \
  --filter-pattern "ERROR"
```

## 🔄 Auto Scaling

### Configure ECS Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/securepr-cluster/securepr-worker \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 10

# Create scaling policy (based on SQS queue depth)
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/securepr-cluster/securepr-worker \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name queue-depth-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

## 🔄 CI/CD with GitHub Actions

See `.github/workflows/deploy-aws.yml` for automated deployment.

Required GitHub Secrets:
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `OPENAI_API_KEY` - OpenAI API key
- `GITHUB_TOKEN` - GitHub personal access token
- `SECUREPR_INGEST_SECRET` - Webhook signature secret

## 💰 Cost Optimization

**Estimated Monthly Cost**:
- ECS Fargate: $50-150 (2 API + 1-10 workers)
- Application Load Balancer: $25
- SQS: $1-5
- AWS Bedrock: $50-300 (pay-per-token)
- CloudWatch: $5-10
- S3: $1
- **Total**: ~$132-491/month

**Cost Reduction Tips**:
1. Use Fargate Spot for worker tasks (70% cheaper)
2. Scale workers to zero when idle
3. Use S3 Intelligent-Tiering
4. Enable CloudWatch log retention policies
5. Use AWS Savings Plans for steady-state workloads

## 🔍 Troubleshooting

### ECS Task won't start

```bash
# Check task status
aws ecs describe-tasks \
  --cluster securepr-cluster \
  --tasks TASK_ARN

# Check service events
aws ecs describe-services \
  --cluster securepr-cluster \
  --services securepr-api

# Check logs
aws logs tail /ecs/securepr-api --follow
```

### SQS Permission Issues

Ensure ECS task role has:
```json
{
  "Effect": "Allow",
  "Action": [
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
    "sqs:SendMessage"
  ],
  "Resource": "arn:aws:sqs:*:*:securepr-queue"
}
```

## 📚 Additional Resources

- [ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [SQS Documentation](https://docs.aws.amazon.com/sqs/)

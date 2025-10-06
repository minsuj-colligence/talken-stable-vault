# Infrastructure

Docker and Terraform configurations for Talken Stable Vault deployment.

## Docker

### Local Development

```bash
cd infra/docker
docker-compose up -d
```

Services:
- **PostgreSQL**: Port 5432
- **Redis**: Port 6379
- **Yields Backend**: Port 3001
- **Operator API**: Port 3002
- **Dashboard**: Port 3000
- **Indexer**: Background service

### Stop Services

```bash
docker-compose down
```

### View Logs

```bash
docker-compose logs -f yields-backend
docker-compose logs -f operator-api
docker-compose logs -f dashboard
```

## Environment Variables

Copy `.env.example` files in each service directory and configure:

- **Yields Backend**: `apps/yields-backend/.env`
- **Operator API**: `apps/operator-api/.env`
- **Dashboard**: `apps/dashboard/.env`
- **Indexer**: `packages/indexer/.env`

## Production Deployment

### Using Docker Compose

```bash
docker-compose -f docker-compose.yml up -d
```

### Using Terraform (Optional)

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## Database Migrations

```bash
# Connect to PostgreSQL
docker exec -it tsv-postgres psql -U talken -d talken_vault

# Run migrations
\i migrations/001_initial.sql
```

## Monitoring

- **Logs**: `docker-compose logs -f`
- **Health**: `curl http://localhost:3001/api/health`
- **Redis**: `docker exec -it tsv-redis redis-cli`
- **PostgreSQL**: `docker exec -it tsv-postgres psql -U talken`

## License

MIT

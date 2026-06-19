# Buzz Events — k3s Deployment

## Architecture Decisions

### Ingress
- **k3s built-in Traefik**, not nginx.
- Annotations `traefik.ingress.kubernetes.io/response-buffering: "false"` + `read-timeout: "200"` preserve SSE (Server-Sent Events).
- Traefik Middleware `sse-optimizer` caps `maxRequestBodyBytes` at 100 MB (for slip image uploads).
- Standard `networking.k8s.io/v1` Ingress resource (not Traefik CRD IngressRoute) for portability.
- External port: **80/443** (standard). `m.dgnr.us` DNS should point at k3s node IP(s). Old port 8604 is retired.

### Namespace
- Everything lives in namespace `buzz`.
- The namespace is created once manually (`kubectl create ns buzz`) and listed in kustomization.yaml.

### Secrets
- **`buzz-env`** Secret created once from `.env`:
  ```
  kubectl create secret generic buzz-env --from-env-file=.env -n buzz
  ```
- All Deployments and the migration Job reference it via `envFrom.secretRef`.
- Update by deleting and recreating (or editing in place):
  ```
  kubectl delete secret buzz-env -n buzz && kubectl create secret generic buzz-env --from-env-file=.env -n buzz
  ```

### Database Migration
- **k8s Job** (deploy-time), not in Dockerfile.
- The `drizzle` stage was removed from `Dockerfile`. The build no longer runs `bun dr push`.
- CI creates the `db-migrate` Job imperatively, waits for completion, then updates deployments.
- The Job uses the frontend image (has drizzle config) and `command: ["bun", "dr", "push"]`.
- Old job is deleted before creating the new one (`kubectl delete job ... --ignore-not-found`).

### Service Discovery
- Frontend Service: `app` (ClusterIP, port 3000).
- Backend reaches frontend at `http://app:3000` (same namespace, k8s DNS resolves `<service>`).
- Backend references in `backend/index.ts:231,279` using `http://app:3000` remain unchanged.
- `lib/auth.ts` `trustedOrigins` includes `http://app.buzz.svc.cluster.local:3000` for completeness.

### CI/CD
- Gitea Actions builds and pushes images as before (same tags: `:frontend`, `:backend`, `:frontend-$SHA`, `:backend-$SHA`).
- Deploy step in `build.yml`:
  1. Delete old migration Job, create fresh one with `:frontend-$SHA`, wait for completion.
  2. `kubectl set image deployment/app` and `deployment/backend` with the new SHA tags.
- Kustomize is used for initial cluster bootstrap (`kubectl apply -k k8s/`). Subsequent updates use imperative `kubectl set image` because Kustomize's `images` field cannot differentiate two images that share the same image name (different tags). If image naming changes to separate repos (e.g., `buzz-frontend:tag` / `buzz-backend:tag`), switch to `kustomize edit set image` + `kubectl apply -k .`.

### CI Authentication
- **ServiceAccount `ci-deployer`** in namespace `buzz`.
- RBAC Role grants: Deployments (get/list/watch/update/patch), Pods (get/list/watch), Jobs (full CRUD), Services/Ingresses/Middlewares (get/list/watch/create/update/patch).
- Token for the runner: `kubectl create token ci-deployer -n buzz` (or use a long-lived token from a Secret tied to the SA).
- The runner also needs `docker` login access to `mts.dgnr.us:5000` (same as today).

### Replicated Stateful Services (external to buzz namespace)
- **PostgreSQL**: CloudNativePG operator. `DATABASE_URL` in Secret points to the CNPG cluster's read-write service (e.g. `postgres://...@<cluster>-rw.<cnpg-ns>.svc:5432/buzz`).
- **Redis**: redis-operator. `REDIS_URL` in Secret points to the Redis operator's endpoint.

### Container Registry
- Same private registry `mts.dgnr.us:5000` running on the k3s control plane node.
- All nodes must be able to pull from it. If registry uses HTTP (no TLS), configure `containerd` registries mirror or set `system-default-registry` in k3s.

### Resource Limits
- **app**: 2 replicas, limits 1 CPU / 1 Gi memory, requests 500m / 512 Mi. Liveness probe on `/api/health` (60s interval). Readiness probe same.
- **backend**: 1 replica, limits 1 CPU / 512 Mi memory, requests 250m / 256 Mi. No probes (no HTTP endpoint).
- **db-migrate Job**: limits 1 CPU / 512 Mi, requests 250m / 256 Mi.

### HPA / PDB
- HPA scales `app` on CPU > 70%, min 2 / max 6 replicas (replaces `swarm.autoscale` label).
- PDB ensures min 1 pod always available during voluntary disruptions (node drains, rollouts).

### TLS
- Not configured in manifests. Currently HTTP-only behind Traefik. Add `spec.tls` + cert-manager or k3s Traefik's built-in Let's Encrypt when ready.

## First Deploy (manual bootstrap)
```bash
kubectl create ns buzz
kubectl create secret generic buzz-env --from-env-file=.env -n buzz
kubectl apply -k k8s/
```

## Subsequent Deploys (CI)
```bash
# In .github/workflows/build.yml
TAG=${{ gitea.sha }}

# DB migration
kubectl delete job db-migrate -n buzz --ignore-not-found
kubectl create job db-migrate \
  --image=mts.dgnr.us:5000/astral/buzz:frontend-$TAG \
  -n buzz \
  --command -- bun dr push
kubectl wait --for=condition=complete job/db-migrate -n buzz --timeout=120s

# Roll app & backend
kubectl set image deployment/app app=mts.dgnr.us:5000/astral/buzz:frontend-$TAG -n buzz
kubectl set image deployment/backend backend=mts.dgnr.us:5000/astral/buzz:backend-$TAG -n buzz
```

## Files Changed from Swarm
| File | Change |
|------|--------|
| `Dockerfile` | Removed `drizzle` stage (migration moved to k8s Job) |
| `lib/auth.ts` | Added `app.buzz.svc.cluster.local:3000` to `trustedOrigins` |
| `.github/workflows/build.yml` | Replaced `docker service update` with k8s deploy commands |
| `nginx/nginx.conf` | Archived — replaced by Traefik Ingress |
| `docker-compose.yml` | Archived — replaced by k8s manifests |

## Key Distinctions from Swarm
- No `overlay` network (k8s CNI handles multi-node networking).
- No host port `8604` (Traefik on 80/443).
- Service discovery via k8s DNS, not Swarm DNS.
- Rolling updates via `kubectl set image`, not `docker service update`.
- Health checks via k8s probes, not Docker HEALTHCHECK.
- Autoscaling via HPA, not `swarm.autoscale` label.

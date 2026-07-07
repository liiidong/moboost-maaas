# Moboost MAAS — 运维部署手册（Vercel + Supabase）

本文用于复刻并长期维护当前线上形态：应用层全部部署在 Vercel（前端 moboost-maas + 后端 ad-localization），数据与存储在 Supabase（Postgres + Storage）。

## 1. 当前架构

- 前端（Next.js）：moboost-maas
  - 运行位置：Vercel（Production）
  - 职责：Web UI、工作流编排、部分 API Routes、与后端联通代理
- 后端（FastAPI）：ad-localization
  - 运行位置：Vercel（Production）
  - 职责：素材本地化/合规/导出等后端 API
- 数据库与存储：Supabase
  - Postgres：同一个 Supabase 项目内隔离两套表
    - `public.*`：moboost-maas 表
    - `adloc.*`：ad-localization 表
  - Storage：素材与产物存储（bucket 通常为 `creatives`）

## 2. 线上地址（示例）

将下列地址替换为你当前 Vercel 的 Production Domain。

- moboost-maas：
  - `https://moboost-maas-htn90u2hg-liiidong-126coms-projects.vercel.app`
- ad-localization：
  - `https://ad-localization-7km7f2k14-liiidong-126coms-projects.vercel.app`
  - 健康检查：`/health`

## 3. 依赖与账号

- Vercel（部署）
- Supabase（DB + Storage）
- Clerk（登录鉴权）
- OpenRouter（模型网关）

密钥获取与本地环境配置可参考：[ENV_GUIDE.md](file:///Users/lidong/3work/HEHE/交接包-01-02-MoboostAI-短剧-2026-06-29/projects/01-moboost-ai/source/moboost%20AI/moboost-maas/docs/ENV_GUIDE.md)

## 4. Supabase 初始化（一次性）

### 4.1 创建项目与获取 Key

- Supabase Dashboard → Settings → API
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### 4.2 Storage Bucket

- Storage → New bucket
  - Bucket：`creatives`

### 4.3 初始化 moboost-maas 数据表（public schema）

- 迁移 SQL 目录：
  - [supabase/migrations](file:///Users/lidong/3work/HEHE/交接包-01-02-MoboostAI-短剧-2026-06-29/projects/01-moboost-ai/source/moboost%20AI/moboost-maas/supabase/migrations)
- 在 Supabase Dashboard → SQL Editor
  - 按文件编号顺序执行：`0001_...` → `0018_...`

### 4.4 初始化 ad-localization schema（adloc）

为避免与 moboost-maas 的 `public.users/projects` 撞表，ad-localization 使用独立 schema。

- schema 初始化迁移：
  - [0019_adloc_schema.sql](file:///Users/lidong/3work/HEHE/交接包-01-02-MoboostAI-短剧-2026-06-29/projects/01-moboost-ai/source/moboost%20AI/moboost-maas/supabase/migrations/0019_adloc_schema.sql)
- 只需确保 schema 存在即可，ad-localization 的业务表由 Alembic 创建（见 6.4）

## 5. Vercel 项目 1：ad-localization（后端）

### 5.1 创建项目

- Vercel → Add New → Project → Import Git Repository
- Root Directory：
  - `services/ad-localization/backend`

### 5.2 必需环境变量（Production + Preview）

- `ADLOC_DATABASE_URL`
  - Supabase Dashboard → Settings → Database → Connection string → URI
  - 将 `postgres://` 改为 `postgresql+psycopg://`
  - 必须带 `sslmode=require`
  - 示例：
    - `postgresql+psycopg://postgres:<DB_PASSWORD>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require`
- `ADLOC_DB_SCHEMA=adloc`
- `ADLOC_SERVICE_TOKEN=<随机长串>`
- `ADLOC_OPENROUTER_API_KEY=<你的 OpenRouter Key>`（推荐）

### 5.3 健康检查

- `GET /health` 应返回 JSON

### 5.4 运行 ad-localization 数据库迁移（一次性）

ad-localization 的业务表通过 Alembic 创建，落在 `adloc` schema。

方式 A（本地 Python 环境）：

```bash
cd services/ad-localization/backend
alembic upgrade head
```

方式 B（Docker，一次性执行）：

```bash
cd services/ad-localization/backend
docker build -t adloc-backend .
docker run --rm \
  -e ADLOC_DATABASE_URL="你的连接串" \
  -e ADLOC_DB_SCHEMA=adloc \
  adloc-backend alembic upgrade head
```

## 6. Vercel 项目 2：moboost-maas（前端/主站）

### 6.1 创建项目

- Vercel → Add New → Project → Import Git Repository
- Root Directory：
  - 仓库根目录（即 `moboost-maas` 目录本身）

### 6.2 必需环境变量（Production + Preview）

Supabase：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET=creatives`

Clerk：
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

OpenRouter：
- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`
- `IMAGE_MODEL=google/gemini-3-pro-image-preview`
- `VIDEO_MODEL=google/veo-3.1`
- `EVAL_MODEL=anthropic/claude-sonnet-4-6`

与后端联通：
- `ADLOC_SERVICE_URL=https://<ad-localization-domain>`
- `ADLOC_SERVICE_TOKEN=<与后端一致>`

安全与运行：
- `ADMIN_TOKEN_SECRET=<随机长串>`
- `DATA_DIR=/tmp/moboost`
- `AUTH_BYPASS=0`
- `NEXT_PUBLIC_AUTH_BYPASS=0`

### 6.3 登录回调

部署完成得到新域名后，需要在 Clerk 控制台将该域名加入允许列表，否则登录可能失败。

### 6.4 后端联通代理说明

moboost-maas 会将 `/api/localization/*` 代理到后端（同时会附加 `ADLOC_SERVICE_TOKEN`）。

- 代理路由实现：
  - [route.ts](file:///Users/lidong/3work/HEHE/交接包-01-02-MoboostAI-短剧-2026-06-29/projects/01-moboost-ai/source/moboost%20AI/moboost-maas/src/app/api/localization/%5B...path%5D/route.ts)

## 7. 发布与回滚

### 7.1 正常发布

- 推送 `main` 分支
- Vercel 会自动触发 Production 部署（或在 Deployments 中选择某条部署 Promote）

### 7.2 回滚

- Vercel → Project → Deployments
  - 找到历史稳定版本
  - Promote to Production

## 8. 自定义域名（不使用 Pro 的方式）

若 Vercel 提示在当前团队策略下无法直接绑定域名，可使用新域名/二级域名方案，按 CNAME 将域名指向 Vercel。

推荐为前后端分别使用子域名：
- 前端：`maas.example.com`
- 后端：`adloc.example.com`

配置流程：
- Vercel Project → Settings → Domains → Add
- DNS 服务商处增加 CNAME（以 Vercel 提示为准，常见值为 `cname.vercel-dns.com`）

域名生效后需同步更新：
- Clerk 允许域名/回调
- moboost-maas 的 `ADLOC_SERVICE_URL`

## 9. 常见问题排查

### 9.1 `/api/localization/health` 返回 HTML

现象：
- HTTP 200，但 Content-Type 为 `text/html`

常见原因：
- 被 Clerk 中间件重定向到登录页/页面路由
- Vercel Deployment Protection 导致访问被拦截

建议排查方法：
- 用浏览器 DevTools → Network 查看该请求是否发生 30x 重定向
- 确认 `ADLOC_SERVICE_URL` 不带路径（不要写 `/health` 或 `/v1`）
- 确认前后端 `ADLOC_SERVICE_TOKEN` 一致

### 9.2 后端 5xx/502

- 先直接访问后端：
  - `https://<ad-localization-domain>/health`
- 再访问前端代理：
  - `https://<moboost-maas-domain>/api/localization/health`
- 若后端健康但代理失败：
  - 检查 moboost-maas 环境变量 `ADLOC_SERVICE_URL`/`ADLOC_SERVICE_TOKEN`

## 10. 资产与密钥管理建议

- 禁止将 `.env*`、service role key、Clerk secret key、OpenRouter key 提交到 GitHub
- 环境变量统一放 Vercel 项目 Settings → Environment Variables
- 定期轮转：
  - `SUPABASE_SERVICE_ROLE_KEY`（谨慎）
  - `CLERK_SECRET_KEY`
  - `OPENROUTER_API_KEY`
  - `ADLOC_SERVICE_TOKEN`


# Atoms 图片广告工作流 — 技术文档

> 创建: 2026-05-21
> 状态: V1 实现完成（Mock 模式）
> 来源: Atoms Ad Design skill（`~/Desktop/atoms-ad-design/SKILL.md`）

---

## 概述

Atoms 图片广告工作流是 March AI 中的一条预置模板，完整对标 Atoms Ad Design skill 的 17 步图片广告制作流程。它复用现有的 DAG 工作流引擎，通过新增和增强节点实现。

**V1 状态**: 所有外部依赖（飞书 API、灵感库、真实 Logo 合成）使用 Mock 数据。核心 DAG 结构、节点执行器、类型系统已完整实现。

---

## 架构

### DAG 结构

```
req_fetch_1 (需求拉取)
    │
    ▼
design_plan (AI 设计方案)
    │
    ▼
ref_pick (选参考图)
    │
    ▼
prompt_gen (生成 Prompt)
    │
    ▼
image_gen_3v (生成 3 个布局, variantCount=3)
    │
    ▼
ai_review_1 (AI 质检)
    │
    ▼
human_review_layout (人工 3 选 1, rejectTarget=design_plan)
    │
    ▼
req_fetch_2 (拉取套版需求)
    │
    ▼
batch_split_adapt (生成适配计划)
    │
    ▼
human_review_plan (确认适配计划, rejectTarget=batch_split_adapt)
    │
    ▼
image_gen_adapt (批量适配生成)
    │
    ▼
ai_review_2 (AI 质检)
    │
    ▼
human_review_adapt (确认适配结果, partialRedo=true, rejectTarget=image_gen_adapt)
    │
    ▼
logo_composite (Logo 合成)
```

### 节点总览

| 节点 ID | 类型 | 描述 | 状态 |
|---------|------|------|------|
| req_fetch_1 | requirement_fetch | 拉取广告需求 | ✅ Mock |
| design_plan | design_plan | AI 生成设计方案 | ✅ LLM |
| ref_pick | reference_pick | 选择参考图 | ✅ Mock |
| prompt_gen | prompt_gen | 生成图片 Prompt | ✅ LLM（复用） |
| image_gen_3v | image_gen | 生成 3 个布局变体 | ✅ OpenRouter |
| ai_review_1 | ai_review | AI 视觉质检 | ✅ Mock（V1 自动通过） |
| human_review_layout | human_review | 人工 3 选 1 | ✅ 暂停等待审批 |
| req_fetch_2 | requirement_fetch | 拉取套版需求 | ✅ Mock |
| batch_split_adapt | batch_split | 生成适配计划 | ✅ 增强 |
| human_review_plan | human_review | 确认适配计划 | ✅ 暂停等待审批 |
| image_gen_adapt | image_gen | 批量适配生成 | ✅ OpenRouter |
| ai_review_2 | ai_review | AI 质检（适配） | ✅ Mock |
| human_review_adapt | human_review | 确认适配结果 | ✅ 暂停等待审批 |
| logo_composite | logo_composite | Logo 合成 | ✅ Mock |

---

## 新增节点详情

### requirement_fetch — 需求拉取

**文件**: `src/lib/workflowNodes/adNodes.ts`

**功能**: 从数据源拉取广告需求，返回结构化的需求数据。

**配置**:
```typescript
{
  source: 'mock' | 'feishu',  // V1 仅支持 mock
  mockData?: RequirementRow[], // 自定义测试数据（可选）
}
```

**输出**: `{ requirements: { batchDate, rows[] }, totalRows, languages[], sizes[] }`

**Mock 测试数据**: 3 条需求行
- English / 1920x1080 / "Turn ideas into products with AI"
- 中文 / 1080x1920 / "用AI把创意变成产品"
- English / 1080x1080 / "Build faster with AI teammates"

**TODO**: 接入飞书开放 API（`fetch_feishu_atoms_requirements.py` 的逻辑）

---

### design_plan — AI 设计方案

**文件**: `src/lib/workflowNodes/adNodes.ts`

**功能**: AI 分析需求数据，生成完整的设计方案。

**配置**:
```typescript
{
  brandName: string,          // 品牌名
  brandGuidelines?: string,   // 品牌规范
  clickDesireRules?: string,  // CTR 审美标准（内置默认值）
}
```

**输入**: `requirements` (来自 requirement_fetch)

**输出**: `{ designPlan: DesignPlanOutput }`
- targetUser, painPoint, brandPromise
- psychologicalTrigger, visualMetaphor, heroElement
- headline, cta
- sizeAssumptions, extensionRisk, fakeUIRisk

**LLM**: 调用 `callJSON`，模型 `anthropic/claude-sonnet-4`

---

### reference_pick — 选参考图

**文件**: `src/lib/workflowNodes/adNodes.ts`

**功能**: 从灵感库中选择最匹配的参考图。

**配置**:
```typescript
{
  source: 'mock' | 'library' | 'manual',
  mockImageUrl?: string,   // Mock 模式的测试图 URL
}
```

**输出**: `{ reference: ReferencePickOutput }` — 包含参考图 URL + 评分

**TODO**: 接入灵感库搜索 API

---

### ai_review — AI 自动质检

**文件**: `src/lib/workflowNodes/adNodes.ts`

**功能**: 对生成的图片进行自动质量审核。

**审核维度**（来自 Atoms skill）:
- CTR 吸引力 ≥ 8
- 视觉清晰度 ≥ 8
- 品牌相关性 ≥ 8
- 审美质量 ≥ 8
- 排版可读性 ≥ 9
- UI/Logo 真实性: 必须通过
- 需求匹配度: 必须通过

**配置**:
```typescript
{
  thresholds?: { ctrHook?, visualClarity?, brandRelevance?, aestheticQuality?, typography? },
  maxAutoRetries?: number,  // 默认 3
}
```

**V1 行为**: Mock 模式，自动通过并返回高分。

**TODO**: 接入多模态模型（GPT-4o / Gemini）做真实视觉审核。

---

### logo_composite — Logo 合成

**文件**: `src/lib/workflowNodes/adNodes.ts`

**功能**: 将官方 Logo 叠加到审批通过的 body 图上。

**配置**:
```typescript
{
  logoUrl: string,
  position: 'auto' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  marginX: number,       // 默认 56
  marginY: number,       // 默认 42
  logoWidthRatio: number, // 默认 0.15
  layoutAware: boolean,   // 自动避开标题
}
```

**V1 行为**: 返回原图 + Logo 合成信息（不实际合成）。

**TODO**: 调用 Python 脚本 `composite_atoms_logo.py` 做真实合成。

---

## 增强的现有节点

### image_gen — 多版本 + 负面约束

新增配置字段:
```typescript
{
  variantCount?: number,         // 生成 N 个布局变体（默认 1）
  negativeConstraints?: string[], // 禁止生成的内容
  logoReserveArea?: {
    position: string,
    widthRatio: number,
    heightRatio: number,
  },
}
```

当 `variantCount > 1` 时，对同一个 prompt 调用 N 次，每次加入变体指令，输出 `images[]` 数组。

### human_review — 回退重做

新增配置字段:
```typescript
{
  reviewType: 'layout-select' | 'adaptation-plan' | 'adaptation-result' | 'generic',
  rejectTarget?: string,  // 拒绝时回退到的节点 ID
  partialRedo?: boolean,  // 允许部分重做
}
```

审批信息会附带 `rejectTarget` 传递给前端，前端可据此展示不同的审批 UI。

### batch_split — 适配计划模式

当输入包含 `requirements.rows` 时，自动进入适配计划模式：从需求行生成适配项列表（语言×尺寸×文案），输出 `{ items, count, isAdaptationPlan: true }`。

---

## 文件清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/lib/workflowTypes.ts` | 修改 | 新增 5 节点类型 + 配置接口 + NODE_REGISTRY |
| `src/lib/workflowNodes/adNodes.ts` | **新建** | 5 个广告节点执行器 |
| `src/lib/workflowNodes/index.ts` | 修改 | 注册 adNodes |
| `src/lib/workflowNodes/mediaNodes.ts` | 修改 | ImageGen 增强（多版本+负面约束） |
| `src/lib/workflowNodes/reviewNodes.ts` | 修改 | HumanReview 增强（回退重做） |
| `src/lib/workflowExecutor.ts` | 修改 | BatchSplit 增强（适配计划模式） |
| `src/lib/workflowGraph.ts` | 修改 | CREDIT_COSTS 新增 5 节点 |
| `src/lib/workflowTemplates/atomsAdTemplate.ts` | **新建** | 完整模板定义 |
| `supabase/migrations/0018_atoms_ad_template.sql` | **新建** | DB 种子数据 |
| `src/lib/__tests__/atomsAdWorkflow.test.ts` | **新建** | 61 个测试用例 |
| `src/lib/__tests__/workflowApi.test.ts` | 修改 | 节点数量断言 12→17 |
| `docs/atoms-ad-workflow.md` | **新建** | 本文档 |

---

## 如何运行工作流

### 1. 通过 API 创建工作流实例

```bash
# 创建一个基于 Atoms 模板的工作流
curl -X POST http://localhost:3000/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Atoms Ad",
    "graph": <atomsAdTemplate JSON>,
    "templateKey": "atoms_ad"
  }'
```

### 2. 运行工作流

```bash
curl -X POST http://localhost:3000/api/workflows/{id}/run \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 3. 监听进度 (SSE)

```bash
curl http://localhost:3000/api/workflows/runs/{runId}/sse
```

### 4. 审批操作

工作流会在 3 个 human_review 节点暂停：

```bash
# 布局审批：选择第 2 个布局
curl -X POST http://localhost:3000/api/workflows/runs/{runId}/review \
  -H "Content-Type: application/json" \
  -d '{"nodeId": "human_review_layout", "action": "approve", "modifiedOutput": {"selectedVariant": 1}}'

# 适配计划审批
curl -X POST http://localhost:3000/api/workflows/runs/{runId}/review \
  -d '{"nodeId": "human_review_plan", "action": "approve"}'

# 适配结果审批
curl -X POST http://localhost:3000/api/workflows/runs/{runId}/review \
  -d '{"nodeId": "human_review_adapt", "action": "approve"}'
```

---

## 测试数据

所有 Mock 数据定义在 `src/lib/workflowNodes/adNodes.ts`：

- **需求数据**: 3 条需求行（英文横版 + 中文竖版 + 英文方版）
- **参考图**: `https://placehold.co/800x600/1a1a2e/eaeaea?text=Reference+Image`
- **Logo**: `https://placehold.co/200x60/000000/ffffff?text=ATOMS`
- **AI 质检**: 自动通过，返回高分

---

## 未来工作（TODO）

1. **飞书对接** — `requirement_fetch` 接入飞书开放 API
2. **灵感库** — `reference_pick` 接入灵感搜索 API（实习生 B 负责）
3. **真实 AI 质检** — `ai_review` 接入多模态模型做视觉审核
4. **真实 Logo 合成** — `logo_composite` 调用 `composite_atoms_logo.py`
5. **审批回退执行** — executor 的 resumeWorkflow 支持回退到指定节点
6. **部分重做** — 适配审批支持只重做失败的子项
7. **交付校验** — 增加 delivery_validation 步骤检查文件数量和命名
8. **Self-Purification** — 长流程上下文清理（防止 AI 因上下文过长出错）

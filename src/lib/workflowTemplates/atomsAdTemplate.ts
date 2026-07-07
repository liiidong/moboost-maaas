/**
 * src/lib/workflowTemplates/atomsAdTemplate.ts
 *
 * Atoms 图片广告工作流 — 预置模板
 * 对标 Atoms Ad Design skill 的 17 步流程
 *
 * DAG 结构：
 * req_fetch_1 → design_plan → ref_pick → prompt_gen → image_gen_3v
 *   → ai_review_1 → human_review_layout → req_fetch_2 → batch_split
 *   → human_review_plan → image_gen_adapt → ai_review_2
 *   → human_review_adapt → logo_composite
 */

import type { WorkflowGraph } from '../workflowTypes';

export const ATOMS_AD_TEMPLATE_KEY = 'atoms_ad';

export const atomsAdTemplate: WorkflowGraph = {
  nodes: [
    // Step 1: 拉取需求（Mock）
    {
      id: 'req_fetch_1',
      type: 'requirement_fetch',
      position: { x: 100, y: 100 },
      data: {
        config: {
          label: '拉取广告需求',
          requirementFetch: {
            source: 'mock',
          },
        },
      },
    },
    // Step 2: AI 设计方案
    {
      id: 'design_plan',
      type: 'design_plan',
      position: { x: 100, y: 250 },
      data: {
        config: {
          label: 'AI 设计方案',
          designPlan: {
            brandName: 'Atoms',
            brandGuidelines: 'Premium performance ad aesthetic. Atoms helps solo founders turn ideas into products with AI. Concrete, not abstract. Momentum from blank page to tangible product.',
          },
        },
      },
    },
    // Step 3: 选参考图（Mock）
    {
      id: 'ref_pick',
      type: 'reference_pick',
      position: { x: 100, y: 400 },
      data: {
        config: {
          label: '选择参考图',
          referencePick: {
            source: 'mock',
          },
        },
      },
    },
    // Step 4: 生成 Prompt
    {
      id: 'prompt_gen',
      type: 'prompt_gen',
      position: { x: 100, y: 550 },
      data: {
        config: {
          label: '生成广告图 Prompt',
          promptGen: {
            dictionary: 'custom',
          },
        },
      },
    },
    // Step 5: 生成 3 个布局版本
    {
      id: 'image_gen_3v',
      type: 'image_gen',
      position: { x: 100, y: 700 },
      data: {
        config: {
          label: '生成 3 个布局',
          imageGen: {
            model: 'google/gemini-3-pro-image-preview',
            width: 1920,
            height: 1080,
            count: 1,
            variantCount: 3,
            negativeConstraints: [
              'logo', 'watermark', 'QR code', 'app store badge',
              'fake UI', 'fake dashboard', 'fake device screen',
              'gibberish text', 'unreadable small text',
            ],
            logoReserveArea: {
              position: 'top-left',
              widthRatio: 0.18,
              heightRatio: 0.12,
            },
          },
        },
      },
    },
    // Step 6: AI 质检
    {
      id: 'ai_review_1',
      type: 'ai_review',
      position: { x: 100, y: 850 },
      data: {
        config: {
          label: 'AI 质检（布局）',
          aiReview: {
            maxAutoRetries: 3,
            thresholds: {
              ctrHook: 8,
              visualClarity: 8,
              brandRelevance: 8,
              aestheticQuality: 8,
              typography: 9,
            },
          },
        },
      },
    },
    // Step 7-8: 人工布局审批（3 选 1）
    {
      id: 'human_review_layout',
      type: 'human_review',
      position: { x: 100, y: 1000 },
      data: {
        config: {
          label: '人工审批：3 选 1 布局',
          humanReview: {
            reviewType: 'layout-select',
            rejectTarget: 'design_plan', // 拒绝→回到设计方案重新出方向
          },
        },
      },
    },
    // Step 9: 重新拉取套版需求
    {
      id: 'req_fetch_2',
      type: 'requirement_fetch',
      position: { x: 100, y: 1150 },
      data: {
        config: {
          label: '拉取套版需求',
          requirementFetch: {
            source: 'mock',
          },
        },
      },
    },
    // Step 10: 生成适配计划
    {
      id: 'batch_split_adapt',
      type: 'batch_split',
      position: { x: 100, y: 1300 },
      data: {
        config: {
          label: '生成适配计划',
        },
      },
    },
    // Step 10-11: 人工确认适配计划
    {
      id: 'human_review_plan',
      type: 'human_review',
      position: { x: 100, y: 1450 },
      data: {
        config: {
          label: '人工审批：确认适配计划',
          humanReview: {
            reviewType: 'adaptation-plan',
            rejectTarget: 'batch_split_adapt',
          },
        },
      },
    },
    // Step 12: 批量适配生成
    {
      id: 'image_gen_adapt',
      type: 'image_gen',
      position: { x: 100, y: 1600 },
      data: {
        config: {
          label: '批量适配生成',
          imageGen: {
            model: 'google/gemini-3-pro-image-preview',
            width: 1920,
            height: 1080,
            count: 1,
            negativeConstraints: [
              'logo', 'watermark', 'QR code', 'app store badge',
              'fake UI', 'fake dashboard', 'fake device screen',
            ],
            logoReserveArea: {
              position: 'top-left',
              widthRatio: 0.18,
              heightRatio: 0.12,
            },
          },
        },
      },
    },
    // Step 13: AI 质检（适配结果）
    {
      id: 'ai_review_2',
      type: 'ai_review',
      position: { x: 100, y: 1750 },
      data: {
        config: {
          label: 'AI 质检（适配）',
          aiReview: {
            maxAutoRetries: 3,
          },
        },
      },
    },
    // Step 13-14: 人工审批适配结果
    {
      id: 'human_review_adapt',
      type: 'human_review',
      position: { x: 100, y: 1900 },
      data: {
        config: {
          label: '人工审批：确认适配结果',
          humanReview: {
            reviewType: 'adaptation-result',
            partialRedo: true,
            rejectTarget: 'image_gen_adapt',
          },
        },
      },
    },
    // Step 16: Logo 合成
    {
      id: 'logo_composite',
      type: 'logo_composite',
      position: { x: 100, y: 2050 },
      data: {
        config: {
          label: 'Logo 合成',
          logoComposite: {
            logoUrl: 'https://placehold.co/200x60/000000/ffffff?text=ATOMS',
            position: 'auto',
            marginX: 56,
            marginY: 42,
            logoWidthRatio: 0.15,
            layoutAware: true,
          },
        },
      },
    },
  ],
  edges: [
    // 主链路
    { id: 'e1', source: 'req_fetch_1', target: 'design_plan' },
    { id: 'e2', source: 'design_plan', target: 'ref_pick' },
    { id: 'e3', source: 'ref_pick', target: 'prompt_gen' },
    { id: 'e4', source: 'prompt_gen', target: 'image_gen_3v' },
    { id: 'e5', source: 'image_gen_3v', target: 'ai_review_1' },
    { id: 'e6', source: 'ai_review_1', target: 'human_review_layout' },
    { id: 'e7', source: 'human_review_layout', target: 'req_fetch_2' },
    { id: 'e8', source: 'req_fetch_2', target: 'batch_split_adapt' },
    { id: 'e9', source: 'batch_split_adapt', target: 'human_review_plan' },
    { id: 'e10', source: 'human_review_plan', target: 'image_gen_adapt' },
    { id: 'e11', source: 'image_gen_adapt', target: 'ai_review_2' },
    { id: 'e12', source: 'ai_review_2', target: 'human_review_adapt' },
    { id: 'e13', source: 'human_review_adapt', target: 'logo_composite' },
  ],
};

/** 用于 DB 种子的完整工作流对象 */
export const atomsAdTemplateRecord = {
  name: 'Atoms 图片广告',
  description: '完整的图片广告制作流程（17步）：需求拉取 → 设计方案 → 选参考 → 生成3版布局 → AI质检 → 人工选1 → 套版适配 → Logo合成 → 交付。对标 Atoms Ad Design skill。',
  graph: atomsAdTemplate,
  template_key: ATOMS_AD_TEMPLATE_KEY,
  is_template: true,
  created_by: 'system',
};

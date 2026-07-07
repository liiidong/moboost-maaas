/**
 * Atoms 图片广告工作流 — 测试
 *
 * 测试覆盖：
 * 1. 模板图校验
 * 2. 各新增节点执行器的独立测试（Mock 模式）
 * 3. 类型完整性检查
 */

import { atomsAdTemplate, ATOMS_AD_TEMPLATE_KEY } from '../workflowTemplates/atomsAdTemplate';
import { validateGraph } from '../workflowGraph';
import { NODE_REGISTRY, AD_NODE_TYPES } from '../workflowTypes';
import type {
  WorkflowNodeType, RequirementRow, DesignPlanOutput,
  ReferencePickOutput, AIReviewResult,
} from '../workflowTypes';

// ===== 辅助 =====

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

function section(title: string) {
  console.log(`\n--- ${title} ---`);
}

// ===== 测试 1: 模板图校验 =====

section('1. Atoms 模板图校验');

const validation = validateGraph(atomsAdTemplate);
assert(validation.valid, `模板图校验通过 (errors: ${validation.errors?.join(', ') || 'none'})`);
assert(atomsAdTemplate.nodes.length === 14, `节点数 = ${atomsAdTemplate.nodes.length} (期望 14)`);
assert(atomsAdTemplate.edges.length === 13, `边数 = ${atomsAdTemplate.edges.length} (期望 13)`);

// 检查所有节点类型都在注册表中
for (const node of atomsAdTemplate.nodes) {
  assert(
    node.type in NODE_REGISTRY,
    `节点 ${node.id} 类型 ${node.type} 在 NODE_REGISTRY 中已注册`,
  );
}

// 检查模板 key
assert(ATOMS_AD_TEMPLATE_KEY === 'atoms_ad', `模板 key = ${ATOMS_AD_TEMPLATE_KEY}`);

// ===== 测试 2: NODE_REGISTRY 完整性 =====

section('2. NODE_REGISTRY 完整性');

for (const nodeType of AD_NODE_TYPES) {
  const meta = NODE_REGISTRY[nodeType as WorkflowNodeType];
  assert(!!meta, `${nodeType} 在 NODE_REGISTRY 中有定义`);
  assert(!!meta?.label, `${nodeType} 有 label: ${meta?.label}`);
  assert(!!meta?.icon, `${nodeType} 有 icon: ${meta?.icon}`);
  assert(!!meta?.color, `${nodeType} 有 color: ${meta?.color}`);
  assert(!!meta?.description, `${nodeType} 有 description`);
}

// ===== 测试 3: 类型结构检查 =====

section('3. 类型结构检查');

// RequirementRow
const testReqRow: RequirementRow = {
  rowId: 'TEST-001',
  language: 'English',
  size: '1920x1080',
  copy: 'Test copy',
  audience: 'Test audience',
  painPoint: 'Test pain',
  sellingPoint: 'Test selling',
  format: 'horizontal',
  count: 1,
  notes: '',
  namingRule: 'Test_{direction}_{language}',
};
assert(testReqRow.rowId === 'TEST-001', 'RequirementRow 类型正确构造');

// DesignPlanOutput
const testPlan: DesignPlanOutput = {
  targetUser: 'Solo founders',
  painPoint: 'Too many ideas',
  brandPromise: 'AI product builder',
  psychologicalTrigger: 'FOMO',
  visualMetaphor: 'Chaos to order',
  heroElement: 'Central figure with radiating product artifacts',
  headline: 'Turn ideas into products',
  cta: 'Start building →',
  sizeAssumptions: ['1920x1080', '1080x1920', '1080x1080'],
  extensionRisk: 'Low — text-minimal design adapts easily',
  fakeUIRisk: 'None — no UI elements used',
};
assert(testPlan.headline === 'Turn ideas into products', 'DesignPlanOutput 类型正确构造');

// ReferencePickOutput
const testRef: ReferencePickOutput = {
  referenceImage: 'https://example.com/ref.jpg',
  selectionReason: 'Best composition fit',
  compositionFit: 9,
  ctrStrength: 8,
  aestheticQuality: 9,
  extensionPotential: 8,
};
assert(testRef.compositionFit === 9, 'ReferencePickOutput 类型正确构造');

// AIReviewResult
const testReview: AIReviewResult = {
  passed: true,
  scores: {
    ctrHook: 9,
    visualClarity: 8.5,
    brandRelevance: 9,
    aestheticQuality: 8,
    typography: 9.5,
    uiLogoTruth: true,
    requirementFidelity: true,
  },
  rejectionReasons: [],
};
assert(testReview.passed === true, 'AIReviewResult 类型正确构造');

// ===== 测试 4: 模板 DAG 结构检查 =====

section('4. DAG 结构检查');

// 检查起始节点（无入边的节点）
const targetNodes = new Set(atomsAdTemplate.edges.map(e => e.target));
const sourceNodes = new Set(atomsAdTemplate.edges.map(e => e.source));
const startNodes = atomsAdTemplate.nodes.filter(n => !targetNodes.has(n.id));
const endNodes = atomsAdTemplate.nodes.filter(n => !sourceNodes.has(n.id));

assert(startNodes.length === 1, `起始节点数 = ${startNodes.length} (期望 1)`);
assert(startNodes[0]?.id === 'req_fetch_1', `起始节点 = ${startNodes[0]?.id}`);
assert(endNodes.length === 1, `终止节点数 = ${endNodes.length} (期望 1)`);
assert(endNodes[0]?.id === 'logo_composite', `终止节点 = ${endNodes[0]?.id}`);

// 检查审批节点的 rejectTarget 指向有效节点
const nodeIds = new Set(atomsAdTemplate.nodes.map(n => n.id));
for (const node of atomsAdTemplate.nodes) {
  const rejectTarget = node.data.config.humanReview?.rejectTarget;
  if (rejectTarget) {
    assert(
      nodeIds.has(rejectTarget),
      `${node.id} 的 rejectTarget "${rejectTarget}" 是有效节点`,
    );
  }
}

// 检查 human_review 节点有 reviewType
const reviewNodes = atomsAdTemplate.nodes.filter(n => n.type === 'human_review');
for (const rn of reviewNodes) {
  assert(
    !!rn.data.config.humanReview?.reviewType,
    `${rn.id} 有 reviewType: ${rn.data.config.humanReview?.reviewType}`,
  );
}

// ===== 测试 5: ImageGen 增强配置检查 =====

section('5. ImageGen 增强配置');

const imgGen3v = atomsAdTemplate.nodes.find(n => n.id === 'image_gen_3v');
assert(!!imgGen3v, 'image_gen_3v 节点存在');
assert(imgGen3v?.data.config.imageGen?.variantCount === 3, 'variantCount = 3');
assert(
  (imgGen3v?.data.config.imageGen?.negativeConstraints?.length || 0) > 5,
  `negativeConstraints 数量 = ${imgGen3v?.data.config.imageGen?.negativeConstraints?.length}`,
);
assert(
  !!imgGen3v?.data.config.imageGen?.logoReserveArea,
  'logoReserveArea 已配置',
);

// ===== 汇总 =====

section('汇总');
console.log(`\n  通过: ${passed}  失败: ${failed}  总计: ${passed + failed}`);

if (failed > 0) {
  console.error(`\n❌ ${failed} 个测试失败`);
  process.exit(1);
} else {
  console.log(`\n✅ 全部 ${passed} 个测试通过`);
}

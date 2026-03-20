import { ChalkSkill, Phase } from './types';
import { getTfidfClassifier } from './tfidf-classifier';

/**
 * Static classification for skills not found in skills-index.yaml.
 * Uses name prefix patterns and capability namespaces.
 */

const PREFIX_RULES: [RegExp, Phase][] = [
  // Reference: framework-specific patterns
  [/^react-/, 'reference'],
  [/^flutter-/, 'reference'],
  [/^nextjs-/, 'reference'],
  [/^python-/, 'reference'],
  [/^fastapi-/, 'reference'],
  [/^tailwind-/, 'reference'],
  [/^typescript-/, 'reference'],
  [/^graphql-/, 'reference'],
  [/^prisma-/, 'reference'],
  [/^vue-/, 'reference'],
  [/^angular-/, 'reference'],
  [/^svelte-/, 'reference'],
  [/^django-/, 'reference'],
  [/^rails-/, 'reference'],
  [/^rust-/, 'reference'],
  [/^go-/, 'reference'],
  [/^docker-/, 'reference'],
  [/^kubernetes-/, 'reference'],
  [/^aws-/, 'reference'],
  [/^gcp-/, 'reference'],
  [/^azure-/, 'reference'],

  // Foundation
  [/^setup-/, 'foundation'],
  [/^create-doc$/, 'foundation'],
  [/^update-doc$/, 'foundation'],
  [/^create-plan$/, 'foundation'],
  [/^create-review$/, 'foundation'],
  [/^create-handoff$/, 'foundation'],
  [/^create-onboarding/, 'foundation'],
  [/^create-retro$/, 'foundation'],
  [/^create-decision-log$/, 'foundation'],
  [/^triage-bugs$/, 'foundation'],
  [/^project-skill-creator$/, 'foundation'],
  [/^product-context-docs$/, 'foundation'],
  [/^simplify$/, 'foundation'],

  // Design & Specification
  [/^create-prd$/, 'design'],
  [/^review-prd$/, 'design'],
  [/^create-user-stories$/, 'design'],
  [/^create-jtbd-canvas$/, 'design'],
  [/^create-interview-guide$/, 'design'],
  [/^synthesize-research$/, 'design'],
  [/^synthesize-feedback$/, 'design'],
  [/^create-shape-up-pitch$/, 'design'],
  [/^score-backlog$/, 'design'],
  [/^analyze-competitors$/, 'design'],
  [/^create-experiment-design$/, 'design'],
  [/^create-roadmap$/, 'design'],
  [/^create-metrics-framework$/, 'design'],
  [/^create-gtm-brief$/, 'design'],
  [/^analyze-metrics$/, 'design'],
  [/^create-stakeholder-update$/, 'design'],
  [/^create-ost$/, 'design'],

  // Architecture & Technical Design
  [/^create-adr$/, 'architecture'],
  [/^create-rfc$/, 'architecture'],
  [/^create-api-design$/, 'architecture'],
  [/^create-data-model$/, 'architecture'],
  [/^create-threat-model$/, 'architecture'],
  [/^create-system-design$/, 'architecture'],
  [/^create-migration-plan$/, 'architecture'],

  // Engineering Handoff & Planning
  [/^create-estimation$/, 'engineering'],
  [/^create-test-plan$/, 'engineering'],
  [/^create-feature-flag-plan$/, 'engineering'],
  [/^audit-/, 'engineering'],
  [/^validate-/, 'engineering'],
  [/^analyze-dependencies$/, 'engineering'],
  [/^create-test-/, 'engineering'],

  // Development & Delivery
  [/^create-pr/, 'development'],
  [/^review-code$/, 'development'],
  [/^review-changes$/, 'development'],
  [/^commit$/, 'development'],
  [/^create-commit-message$/, 'development'],
  [/^create-bug-report$/, 'development'],
  [/^create-github-issue$/, 'development'],
  [/^debug-/, 'development'],
  [/^manage-tech-debt$/, 'development'],
  [/^fix-/, 'development'],
  [/^capture-pr-visuals$/, 'development'],
  [/^work-issue$/, 'development'],
  [/^refactor-/, 'development'],

  // Launch & Release
  [/^create-release-/, 'launch'],
  [/^create-rollback-plan$/, 'launch'],
  [/^create-runbook$/, 'launch'],
  [/^create-incident-report$/, 'launch'],
  [/^create-postmortem$/, 'launch'],
  [/^create-changelog$/, 'launch'],
  [/^create-deploy-/, 'launch'],
];

const CAPABILITY_NAMESPACE_MAP: Record<string, Phase> = {
  'docs': 'foundation',
  'review': 'foundation',
  'planning': 'foundation',
  'skills': 'foundation',
  'chalk': 'foundation',
  'research': 'design',
  'metrics': 'design',
  'product': 'design',
  'api': 'architecture',
  'data': 'architecture',
  'security': 'architecture',
  'testing': 'engineering',
  'quality': 'engineering',
  'code': 'development',
  'git': 'development',
  'deploy': 'launch',
  'release': 'launch',
  'ops': 'launch',
};

/** Description keyword scoring for enhanced classification */
const DESCRIPTION_KEYWORDS: Record<Phase, string[]> = {
  foundation: [
    'documentation', 'setup', 'onboarding', 'plan', 'review', 'standards',
    'template', 'scaffold', 'initialize', 'guide', 'convention', 'getting started',
    'project structure', 'decision log', 'handoff',
  ],
  design: [
    'prd', 'user stories', 'research', 'metrics', 'roadmap', 'experiment',
    'stakeholder', 'competitor', 'interview', 'feedback', 'backlog', 'priorit',
    'requirements', 'specification', 'persona', 'journey map', 'market',
  ],
  architecture: [
    'adr', 'rfc', 'api design', 'data model', 'threat model', 'schema',
    'system design', 'migration', 'infrastructure', 'protocol', 'interface',
    'service boundary', 'microservice', 'database design',
  ],
  engineering: [
    'test plan', 'estimation', 'audit', 'validate', 'dependency', 'feature flag',
    'performance', 'benchmark', 'accessibility', 'coverage', 'quality assurance',
    'load test', 'integration test',
  ],
  development: [
    'pull request', 'code review', 'commit', 'bug', 'debug', 'issue', 'fix',
    'refactor', 'implementation', 'coding', 'branch', 'merge', 'diff',
    'tech debt', 'hotfix',
  ],
  launch: [
    'release', 'rollback', 'runbook', 'incident', 'postmortem', 'changelog',
    'deploy', 'production', 'monitoring', 'alert', 'rollout', 'launch',
    'version bump', 'tag',
  ],
  reference: [
    'react', 'flutter', 'nextjs', 'python', 'typescript', 'tailwind',
    'graphql', 'prisma', 'vue', 'angular', 'svelte', 'django', 'rails',
    'docker', 'kubernetes', 'aws', 'gcp', 'framework', 'library',
  ],
  uncategorized: [],
};

/** Artifact glob pattern -> phase mapping */
const ARTIFACT_PHASE_MAP: [RegExp, Phase][] = [
  [/\.chalk\/docs/, 'foundation'],
  [/\.chalk\/reviews/, 'foundation'],
  [/\.chalk\/plans/, 'foundation'],
  [/\.chalk\/decisions/, 'foundation'],
  [/\.chalk\/prds?\//, 'design'],
  [/\.chalk\/research/, 'design'],
  [/\.chalk\/adrs?\//, 'architecture'],
  [/\.chalk\/rfcs?\//, 'architecture'],
  [/\.chalk\/api-design/, 'architecture'],
  [/\*\*\/\*\.test\.\*/, 'engineering'],
  [/\*\*\/\*\.spec\.\*/, 'engineering'],
  [/\.github\//, 'development'],
  [/\.chalk\/releases?\//, 'launch'],
  [/\.chalk\/runbooks?\//, 'launch'],
  [/\.chalk\/incidents?\//, 'launch'],
];

/**
 * Original classifier: name prefix + capability namespace.
 * Used as first pass.
 */
export function classifyPhase(skillName: string, capabilities: string[]): Phase {
  // Try prefix rules first
  for (const [pattern, phase] of PREFIX_RULES) {
    if (pattern.test(skillName)) {
      return phase;
    }
  }

  // Try capability namespace fallback
  for (const cap of capabilities) {
    const ns = cap.split('.')[0];
    if (ns && CAPABILITY_NAMESPACE_MAP[ns]) {
      return CAPABILITY_NAMESPACE_MAP[ns];
    }
  }

  return 'uncategorized';
}

/**
 * Enhanced classifier: uses full skill metadata for better coverage.
 * Runs name prefix -> capability namespace -> description keywords -> artifact patterns.
 */
export function classifyPhaseEnhanced(skill: ChalkSkill): Phase {
  // First try the original classifier
  const basic = classifyPhase(skill.id, skill.capabilities);
  if (basic !== 'uncategorized') return basic;

  // Try TF-IDF classifier
  const tfidf = getTfidfClassifier();
  const tfidfResult = tfidf.classify(skill.description, skill.id);
  if (tfidfResult.confidence > 0.15) return tfidfResult.phase;

  // Score description keywords
  const desc = skill.description.toLowerCase();
  const scores = new Map<Phase, number>();

  for (const [phase, keywords] of Object.entries(DESCRIPTION_KEYWORDS)) {
    if (phase === 'uncategorized') continue;
    let score = 0;
    for (const kw of keywords) {
      if (desc.includes(kw)) score++;
    }
    if (score > 0) scores.set(phase as Phase, score);
  }

  // Also score the skill name (split on hyphens)
  const nameParts = skill.id.toLowerCase().split('-');
  for (const [phase, keywords] of Object.entries(DESCRIPTION_KEYWORDS)) {
    if (phase === 'uncategorized') continue;
    for (const kw of keywords) {
      for (const part of nameParts) {
        if (kw.includes(part) && part.length >= 3) {
          scores.set(phase as Phase, (scores.get(phase as Phase) ?? 0) + 0.5);
        }
      }
    }
  }

  // Check artifact patterns
  for (const artifact of skill.activationArtifacts) {
    for (const [pattern, phase] of ARTIFACT_PHASE_MAP) {
      if (pattern.test(artifact)) {
        scores.set(phase, (scores.get(phase) ?? 0) + 2);
      }
    }
  }

  // Extended capability namespace check
  for (const cap of skill.capabilities) {
    const parts = cap.split('.');
    for (const part of parts) {
      if (CAPABILITY_NAMESPACE_MAP[part]) {
        scores.set(CAPABILITY_NAMESPACE_MAP[part], (scores.get(CAPABILITY_NAMESPACE_MAP[part]) ?? 0) + 1);
      }
    }
  }

  // Return highest scoring phase
  if (scores.size > 0) {
    let bestPhase: Phase = 'uncategorized';
    let bestScore = 0;
    for (const [phase, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestPhase = phase;
      }
    }
    if (bestScore >= 1) return bestPhase;
  }

  return 'uncategorized';
}

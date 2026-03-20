import { ChalkSkill, Phase } from './types';

// Common English stopwords to filter out
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'must', 'ought',
  'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either',
  'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too',
  'very', 'just', 'because', 'as', 'until', 'while', 'of', 'at', 'by',
  'for', 'with', 'about', 'against', 'between', 'through', 'during',
  'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his',
  'she', 'her', 'it', 'its', 'they', 'them', 'their',
]);

/** Reference descriptions per phase for training */
const PHASE_REFERENCE_TEXTS: Record<Phase, string[]> = {
  foundation: [
    'create documentation for the project setup and onboarding',
    'generate project plan and development standards template',
    'write review documentation and decision log',
    'scaffold project structure and initialize repository',
    'create handoff documentation and getting started guide',
    'manage project conventions and coding standards',
    'set up documentation site and knowledge base',
    'create retrospective report and process improvement',
  ],
  design: [
    'create product requirements document PRD and user stories',
    'conduct user research and synthesize customer feedback',
    'analyze competitors and market landscape research',
    'define metrics framework and success measurement',
    'prioritize backlog and score feature requests',
    'create roadmap and stakeholder update presentation',
    'design experiment and hypothesis validation plan',
    'create go to market brief and launch strategy',
    'create interview guide for user research sessions',
  ],
  architecture: [
    'create architecture decision record ADR and technical RFC',
    'design API endpoints and data model schema',
    'create threat model and security architecture review',
    'plan system design and service boundary definition',
    'design database schema and migration strategy',
    'define infrastructure architecture and deployment topology',
    'create technical design document for microservices',
  ],
  engineering: [
    'create test plan and quality assurance strategy',
    'estimate engineering effort and sprint planning',
    'audit code for accessibility and performance',
    'validate dependencies and security vulnerabilities',
    'create feature flag rollout plan and gradual release',
    'benchmark performance and load testing strategy',
    'create integration test and coverage improvement plan',
  ],
  development: [
    'create pull request and code review description',
    'review code changes and provide feedback',
    'commit changes and create meaningful commit messages',
    'debug and fix bugs systematically',
    'create bug report and github issue from error',
    'refactor code and manage technical debt',
    'implement feature and write implementation code',
    'work on issue and track progress in branch',
  ],
  launch: [
    'create release checklist and changelog documentation',
    'plan rollback strategy and incident response procedure',
    'create runbook for production operations and monitoring',
    'write incident report and post mortem analysis',
    'deploy to production and manage release pipeline',
    'create monitoring alerts and observability dashboard',
    'tag version and prepare release candidate',
  ],
  reference: [
    'react component pattern and state management guide',
    'flutter widget development and mobile app framework',
    'nextjs routing and server side rendering configuration',
    'typescript type system and generic pattern usage',
    'tailwind css styling and responsive design utilities',
    'python library usage and framework best practices',
    'docker container configuration and kubernetes deployment',
  ],
  uncategorized: [],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

type TfVector = Map<string, number>;

function computeTF(tokens: string[]): TfVector {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  // Normalize
  const max = Math.max(...tf.values(), 1);
  for (const [k, v] of tf) {
    tf.set(k, v / max);
  }
  return tf;
}

function cosineSimilarity(a: TfVector, b: TfVector): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const allKeys = new Set([...a.keys(), ...b.keys()]);

  for (const key of allKeys) {
    const va = a.get(key) ?? 0;
    const vb = b.get(key) ?? 0;
    dotProduct += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

export class TfidfClassifier {
  private phaseVectors = new Map<Phase, TfVector>();
  private idf = new Map<string, number>();
  private trained = false;

  /**
   * Train the classifier using reference texts and optionally already-classified skills.
   */
  train(classifiedSkills: ChalkSkill[] = []) {
    // Build corpus: reference texts + classified skill descriptions
    const phaseDocs = new Map<Phase, string[]>();

    for (const [phase, texts] of Object.entries(PHASE_REFERENCE_TEXTS)) {
      if (phase === 'uncategorized') continue;
      phaseDocs.set(phase as Phase, [...texts]);
    }

    for (const skill of classifiedSkills) {
      if (skill.phase === 'uncategorized') continue;
      const docs = phaseDocs.get(skill.phase) ?? [];
      docs.push(skill.description);
      // Also add the skill name as a document (it's informative)
      docs.push(skill.id.replace(/-/g, ' '));
      phaseDocs.set(skill.phase, docs);
    }

    // Compute IDF across all documents
    const allDocs: string[][] = [];
    for (const docs of phaseDocs.values()) {
      for (const doc of docs) {
        allDocs.push(tokenize(doc));
      }
    }

    const docCount = allDocs.length;
    const termDocFreq = new Map<string, number>();

    for (const tokens of allDocs) {
      const unique = new Set(tokens);
      for (const t of unique) {
        termDocFreq.set(t, (termDocFreq.get(t) ?? 0) + 1);
      }
    }

    for (const [term, freq] of termDocFreq) {
      this.idf.set(term, Math.log(docCount / (freq + 1)) + 1);
    }

    // Build TF-IDF vector per phase (average of all docs in that phase)
    for (const [phase, docs] of phaseDocs) {
      const combinedTokens = docs.flatMap(d => tokenize(d));
      const tf = computeTF(combinedTokens);

      // Apply IDF weighting
      const tfidf = new Map<string, number>();
      for (const [term, tfVal] of tf) {
        const idfVal = this.idf.get(term) ?? 1;
        tfidf.set(term, tfVal * idfVal);
      }

      this.phaseVectors.set(phase, tfidf);
    }

    this.trained = true;
  }

  /**
   * Classify a skill description into a phase with confidence score.
   */
  classify(description: string, skillName?: string): { phase: Phase; confidence: number } {
    if (!this.trained) {
      return { phase: 'uncategorized', confidence: 0 };
    }

    // Tokenize input (combine description + name for more signal)
    const inputText = skillName
      ? `${description} ${skillName.replace(/-/g, ' ')}`
      : description;
    const tokens = tokenize(inputText);
    const tf = computeTF(tokens);

    // Apply IDF
    const inputVector = new Map<string, number>();
    for (const [term, tfVal] of tf) {
      const idfVal = this.idf.get(term) ?? 1;
      inputVector.set(term, tfVal * idfVal);
    }

    // Score against each phase
    let bestPhase: Phase = 'uncategorized';
    let bestScore = 0;

    for (const [phase, phaseVec] of this.phaseVectors) {
      const score = cosineSimilarity(inputVector, phaseVec);
      if (score > bestScore) {
        bestScore = score;
        bestPhase = phase;
      }
    }

    return { phase: bestPhase, confidence: bestScore };
  }
}

/** Singleton instance */
let classifierInstance: TfidfClassifier | null = null;

export function getTfidfClassifier(): TfidfClassifier {
  if (!classifierInstance) {
    classifierInstance = new TfidfClassifier();
  }
  return classifierInstance;
}

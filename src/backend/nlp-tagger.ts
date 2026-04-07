/**
 * Dictionary-based NLP tech-tag extractor (BA §2.2.3)
 * MVP: keyword matching against curated dictionary.
 * Production upgrade path: replace with Claude API call.
 */

const TECH_DICTIONARY: string[] = [
  // Programming languages
  'Python', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Java', 'Go', 'Rust',
  'Kotlin', 'Swift', 'R', 'MATLAB', 'SQL', 'PHP', 'Ruby', 'Scala', 'Haskell',
  // ML / AI
  'Machine Learning', 'Deep Learning', 'Neural Networks', 'TensorFlow', 'PyTorch',
  'Keras', 'Scikit-learn', 'XGBoost', 'LightGBM', 'NLP', 'Computer Vision',
  'Reinforcement Learning', 'Transformers', 'LLM', 'RAG', 'AI Ethics', 'AI Bias',
  // Data
  'Data Analysis', 'Data Science', 'Data Engineering', 'SQL', 'NoSQL',
  'PostgreSQL', 'MongoDB', 'Redis', 'Spark', 'Hadoop', 'ETL', 'Pandas',
  'NumPy', 'Feature Engineering', 'Statistics', 'Visualization',
  // Web / Cloud
  'React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'FastAPI', 'Django',
  'Flask', 'REST API', 'GraphQL', 'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes',
  'Vercel', 'Railway', 'Supabase', 'Firebase',
  // Hardware / Robotics
  'Arduino', 'Raspberry Pi', 'Robotics', 'ROS', 'CAD', 'IoT', 'Embedded',
  '3D Printing', 'Electronics', 'Circuit Design', 'VEX',
  // Research / Academic
  'Research', 'Lab Research', 'Scientific Writing', 'Benchmark',
  'Competitive Programming', 'Algorithms', 'Data Structures',
  // Soft / Social
  'Leadership', 'Teaching', 'Social Impact', 'Communication', 'Teamwork',
  'Project Management',
  // Certifications / Platforms
  'Coursera', 'edX', 'Kaggle', 'LeetCode', 'Codeforces', 'HackerRank',
  'Google Cloud', 'Microsoft Azure', 'AWS Certification',
  // Scratch (specific for teaching context)
  'Scratch',
]

// Normalise once for fast lookups
const normDict = TECH_DICTIONARY.map((t) => ({
  original: t,
  lower: t.toLowerCase(),
}))

/**
 * Extract tech tags from free-text STAR fields.
 * @param text - Usually the star_action field (≥50 chars)
 * @returns Unique array of matched tech tag strings
 */
export function extractTechTags(text: string): string[] {
  const lower = text.toLowerCase()
  const matched = new Set<string>()

  for (const { original, lower: kw } of normDict) {
    if (lower.includes(kw)) {
      matched.add(original)
    }
  }

  return Array.from(matched)
}

/**
 * Score base quality of an activity (1–5) based on STAR completeness.
 * Used as a lightweight heuristic until Claude API scoring is integrated.
 */
export function scoreStar(activity: {
  star_situation: string
  star_task: string
  star_action: string
  star_result: string
  trust_tier: number
  tech_tags?: string[]
}): number {
  let score = 1.0

  // Length quality
  if (activity.star_action.length >= 200) score += 1.0
  else if (activity.star_action.length >= 100) score += 0.5

  if (activity.star_result.length >= 100) score += 0.5

  // Quantitative result indicator (numbers in result)
  if (/\d/.test(activity.star_result)) score += 0.5

  // Tech depth
  const tagCount = activity.tech_tags?.length ?? 0
  if (tagCount >= 3) score += 1.0
  else if (tagCount >= 1) score += 0.5

  // Trust bonus
  if (activity.trust_tier === 3) score += 0.5

  return Math.min(Math.round(score * 2) / 2, 5.0) // round to nearest 0.5, cap at 5
}

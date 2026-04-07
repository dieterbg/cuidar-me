// Barrel export — maintains backward compatibility with `import { X } from '@/lib/data'`
export { gamificationConfig } from './gamification-config';
export { 
  mandatoryGamificationSteps, 
  fundamentosGamificationSteps, 
  performanceGamificationSteps,
  getGamificationSteps
} from './gamification-steps';
export { protocols } from './protocols';
export { patients, conversations, healthMetrics, videos, communityPosts } from './seed-data';

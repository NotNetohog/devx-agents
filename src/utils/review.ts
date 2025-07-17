import dotenv from 'dotenv';
import { reviewAgent } from '../agents/review-agent';

dotenv.config({ path: '.env.local' });

reviewAgent(
  'review the pull request according to your guidelines',
  'https://github.com/bornlogic/app-studio-mf/pull/872'
)
  .then(console.log)
  .catch(console.error);

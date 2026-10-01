import HomeClient from './HomeClient';
import { bootstrapData } from '@/lib/serverData';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let initial = null;
  try { initial = await bootstrapData(); } catch (e) { initial = null; }
  return <HomeClient initial={initial} />;
}

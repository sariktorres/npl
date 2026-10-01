import LiveClient from './LiveClient';
import { liveMatchData } from '@/lib/serverData';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let initial = null;
  try { initial = await liveMatchData(); } catch (e) { initial = null; }
  return <LiveClient initial={initial} />;
}

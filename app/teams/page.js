import TeamsClient from './TeamsClient';
import { bootstrapData } from '@/lib/serverData';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  let initial = null;
  try { initial = await bootstrapData(); } catch (error) { initial = null; }
  if (!initial) return <main className="min-h-screen grid place-items-center p-6 text-center text-muted-foreground">Team information is temporarily unavailable.</main>;
  return <TeamsClient initial={initial} />;
}

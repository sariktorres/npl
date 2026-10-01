import AuctionClient from './AuctionClient';
import { auctionRoomData } from '@/lib/serverData';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let initial = null;
  try { initial = await auctionRoomData(); } catch (e) { initial = null; }
  return <AuctionClient initial={initial} />;
}

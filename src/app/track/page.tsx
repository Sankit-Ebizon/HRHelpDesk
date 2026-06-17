import { TrackTicketClient } from "@/components/public/track-ticket-client";
import { getSupportEmail } from "@/lib/queries";

export default async function TrackTicketPage() {
  const supportEmail = await getSupportEmail();
  return <TrackTicketClient supportEmail={supportEmail} />;
}

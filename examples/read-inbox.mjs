import { ExpectboxAgent } from "expectbox-agents";
const agent = new ExpectboxAgent({
  apiKey: process.env.EXPECTBOX_AGENT_API_KEY,
});
const page = await agent.messages(process.env.EXPECTBOX_AGENT_INBOX_ID, {
  limit: 20,
});
console.log(`${page.items.length} messages; more: ${Boolean(page.next)}`);

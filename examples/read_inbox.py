import os
from expectbox_agents import ExpectboxAgent

agent = ExpectboxAgent(os.environ['EXPECTBOX_AGENT_API_KEY'])
page = agent.messages(os.environ['EXPECTBOX_AGENT_INBOX_ID'], limit=20)
print(f"{len(page['items'])} messages; more: {bool(page['next'])}")

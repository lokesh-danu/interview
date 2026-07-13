# Agent Service — Design Doc

## Overview

Python-based AI agent using LangGraph for the ReAct (Reasoning + Acting) pattern. Handles chat messages by querying document embeddings via pgvector and generating responses. Supports tool use for semantic search over workspace documents. Can execute generated code in E2B sandboxes.

---

## Tech Stack

- Python 3.11+
- LangGraph (agent framework)
- LangChain (LLM integration)
- OpenAI or Anthropic API (LLM)
- `psycopg2` or `asyncpg` (PostgreSQL)
- `pika` (RabbitMQ client)
- `redis` (SSE event publishing)
- E2B SDK (sandboxed code execution)

---

## File Structure

```
agent/
├── src/
│   ├── main.py                 # Entry point, starts consumer
│   ├── consumer.py             # RabbitMQ consumer
│   ├── agent.py                # LangGraph agent definition
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── base.py             # Base tool interface
│   │   ├── query_embeddings.py # Semantic search over documents
│   │   └── code_executor.py    # E2B sandbox code execution
│   ├── prompts.py              # System prompts
│   ├── llm.py                  # LLM client setup
│   ├── db.py                   # PostgreSQL queries
│   ├── sse.py                  # Redis SSE publisher
│   └── sandbox.py              # E2B sandbox wrapper
├── requirements.txt
└── Dockerfile
```

---

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LangGraph Agent                                │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────┐
  │  State                                                                 │
  │  ─────                                                                 │
  │  messages: List[Message]     # Chat history                            │
  │  org_id: str                 # Current org context                     │
  │  document_ids: List[str]     # Documents to search                     │
  │  sources: List[Source]       # Retrieved sources for response          │
  └─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  Agent Node (LLM)                                                      │
  │  ─────────────────                                                     │
  │  - Receives messages + context                                         │
  │  - Decides: respond directly OR use tool                               │
  │  - Outputs: tool_call or final_response                                │
  └────────────────────────────────────┬────────────────────────────────────┘
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
  ┌─────────────────────────────┐     ┌─────────────────────────────┐
  │  Tool Node                  │     │  Response                   │
  │  ──────────                 │     │  ────────                   │
  │  Execute tool call          │     │  Stream response to SSE     │
  │  Return result to agent     │     │  Save to database           │
  └─────────────────────────────┘     └─────────────────────────────┘
```

### State Graph

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated, List
import operator

class AgentState(TypedDict):
    messages: Annotated[list, operator.add]  # Accumulates messages
    org_id: str
    document_ids: List[str]
    sources: List[dict]

# Build graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("agent", agent_node)
workflow.add_node("tools", tool_node)

# Add edges
workflow.set_entry_point("agent")
workflow.add_conditional_edges(
    "agent",
    should_continue,  # If tool_call → tools, else → END
    {
        "tools": "tools",
        END: END,
    }
)
workflow.add_edge("tools", "agent")  # After tools, back to agent

agent = workflow.compile()
```

---

## Components

### Consumer (`consumer.py`)

```python
import pika
import json
import os
from agent import run_agent

def start_consumer():
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=os.environ.get('RABBITMQ_HOST', 'localhost'))
    )
    channel = connection.channel()

    # Chat messages queue
    channel.queue_declare(queue='chat.message', durable=True)
    # Agent run queue
    channel.queue_declare(queue='agent.run', durable=True)

    def handle_chat(ch, method, properties, body):
        message = json.loads(body)
        try:
            run_agent(
                session_id=message['sessionId'],
                chat_id=message['chatId'],
                org_id=message['orgId'],
                content=message['content'],
                document_ids=message.get('documentIds', []),
                context_messages=message.get('contextMessages', []),
            )
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            print(f"Error handling chat: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    def handle_agent_run(ch, method, properties, body):
        message = json.loads(body)
        try:
            # Similar to chat but produces a report
            run_agent_report(
                run_id=message['runId'],
                org_id=message['orgId'],
                document_ids=message['documentIds'],
                prompt=message.get('prompt'),
            )
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            print(f"Error handling agent run: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    channel.basic_consume(queue='chat.message', on_message_callback=handle_chat)
    channel.basic_consume(queue='agent.run', on_message_callback=handle_agent_run)

    print("Agent started. Waiting for messages...")
    channel.start_consuming()
```

### Agent (`agent.py`)

```python
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from tools.query_embeddings import query_embeddings_tool
from prompts import SYSTEM_PROMPT
from llm import get_llm
from sse import publish_sse_event
from db import save_message
from typing import TypedDict, Annotated, List
import operator

class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    org_id: str
    document_ids: List[str]
    sources: Annotated[list, operator.add]

def agent_node(state: AgentState):
    """LLM decides what to do."""
    llm = get_llm()
    tools = [query_embeddings_tool]

    system_msg = SystemMessage(content=SYSTEM_PROMPT)
    messages = [system_msg] + state['messages']

    response = llm.bind_tools(tools).invoke(messages)

    return {"messages": [response]}

def tool_node(state: AgentState):
    """Execute tool calls."""
    last_message = state['messages'][-1]
    results = []
    sources = []

    for tool_call in last_message.tool_calls:
        if tool_call['name'] == 'query_embeddings':
            result = query_embeddings_tool.invoke(tool_call['args'])
            results.append(result)
            sources.extend(result.get('sources', []))

    return {
        "messages": [ToolMessage(content=str(results), tool_call_id=last_message.tool_calls[0]['id'])],
        "sources": sources,
    }

def should_continue(state: AgentState):
    """Route to tools or end."""
    last_message = state['messages'][-1]
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"
    return END

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("agent", agent_node)
workflow.add_node("tools", tool_node)
workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
workflow.add_edge("tools", "agent")

agent_graph = workflow.compile()

async def run_agent(session_id: str, chat_id: str, org_id: str, content: str, document_ids: list, context_messages: list):
    """Run agent for a chat message."""

    # Build message history
    messages = []
    for msg in context_messages:
        if msg['role'] == 'user':
            messages.append(HumanMessage(content=msg['content']))
        else:
            messages.append(AIMessage(content=msg['content']))

    messages.append(HumanMessage(content=content))

    # Run agent
    final_state = await agent_graph.ainvoke({
        "messages": messages,
        "org_id": org_id,
        "document_ids": document_ids,
        "sources": [],
    })

    # Extract response
    response = final_state['messages'][-1].content
    sources = final_state.get('sources', [])

    # Stream to SSE
    # Split response into chunks for streaming effect
    for i in range(0, len(response), 20):
        chunk = response[i:i+20]
        await publish_sse_event(session_id, {
            "type": "delta",
            "data": {"content": chunk}
        })

    # Send sources
    if sources:
        await publish_sse_event(session_id, {
            "type": "sources",
            "data": {"documents": sources}
        })

    # Send done
    message_id = save_message(chat_id, 'assistant', response, sources)
    await publish_sse_event(session_id, {
        "type": "done",
        "data": {"message_id": message_id, "full_content": response}
    })
```

### Tools

#### Query Embeddings (`tools/query_embeddings.py`)

```python
from langchain_core.tools import tool
from db import search_embeddings

@tool
def query_embeddings(query: str, document_ids: list[str] = None) -> dict:
    """
    Search document content using semantic similarity.

    Args:
        query: The search query
        document_ids: Optional list of document IDs to search within. If empty, searches all docs in org.

    Returns:
        dict with 'results' (list of matching chunks) and 'sources' (for citation)
    """
    # This will be called with org_id from agent state via binding
    results = search_embeddings(query, document_ids, limit=10)

    return {
        "results": [
            {
                "content": r['content'],
                "document_id": r['document_id'],
                "filename": r['filename'],
                "metadata": r['metadata'],
            }
            for r in results
        ],
        "sources": [
            {
                "documentId": r['document_id'],
                "filename": r['filename'],
                "chunk": r['content'][:200] + "...",
            }
            for r in results[:3]  # Top 3 for citation
        ]
    }
```

#### Code Executor (`tools/code_executor.py`)

```python
from langchain_core.tools import tool
from sandbox import run_in_sandbox

@tool
def execute_code(code: str) -> dict:
    """
    Execute Python code in a sandboxed environment.

    Args:
        code: Python code to execute

    Returns:
        dict with 'stdout', 'stderr', and 'exit_code'
    """
    result = run_in_sandbox(code)
    return result
```

### LLM Setup (`llm.py`)

```python
from langchain_openai import ChatOpenAI
import os

def get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=os.environ.get('LLM_MODEL', 'gpt-4o-mini'),
        temperature=0,
        streaming=True,
    )
```

### Prompts (`prompts.py`)

```python
SYSTEM_PROMPT = """You are a helpful assistant for a collaborative workspace. 
You have access to documents uploaded by users and can search through them to answer questions.

When answering questions:
1. Use the query_embeddings tool to find relevant document content
2. Base your answers on the retrieved content
3. Cite which documents you're referencing
4. If you can't find relevant information, say so honestly

You can also execute Python code if needed for data analysis tasks.
"""
```

### Database (`db.py`)

```python
import psycopg2
import os
from typing import List, Optional

def get_connection():
    return psycopg2.connect(os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/workspace'))

def search_embeddings(query_embedding: List[float], document_ids: Optional[List[str]], org_id: str, limit: int = 10) -> List[dict]:
    """Search for similar chunks using pgvector."""
    conn = get_connection()
    cur = conn.cursor()

    if document_ids:
        cur.execute("""
            SELECT dc.id, dc.content, dc.metadata, dc.document_id, d.filename,
                   1 - (dc.embedding <=> %s) as similarity
            FROM document_chunks dc
            JOIN documents d ON d.id = dc.document_id
            WHERE dc.org_id = %s AND dc.document_id = ANY(%s)
            ORDER BY dc.embedding <=> %s
            LIMIT %s
        """, (query_embedding, org_id, document_ids, query_embedding, limit))
    else:
        cur.execute("""
            SELECT dc.id, dc.content, dc.metadata, dc.document_id, d.filename,
                   1 - (dc.embedding <=> %s) as similarity
            FROM document_chunks dc
            JOIN documents d ON d.id = dc.document_id
            WHERE dc.org_id = %s
            ORDER BY dc.embedding <=> %s
            LIMIT %s
        """, (query_embedding, org_id, query_embedding, limit))

    results = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {
            'id': r[0],
            'content': r[1],
            'metadata': r[2],
            'document_id': r[3],
            'filename': r[4],
            'similarity': r[5],
        }
        for r in results
    ]

def save_message(chat_id: str, role: str, content: str, sources: list = None) -> str:
    """Save message to database and return message ID."""
    conn = get_connection()
    cur = conn.cursor()

    import json
    metadata = {'sources': sources} if sources else {}

    cur.execute("""
        INSERT INTO messages (chat_id, role, content, metadata)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    """, (chat_id, role, content, json.dumps(metadata)))

    message_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return message_id

def get_chat_context(chat_id: str, limit: int = 20) -> List[dict]:
    """Get recent messages for context."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT role, content, metadata
        FROM messages
        WHERE chat_id = %s
        ORDER BY created_at DESC
        LIMIT %s
    """, (chat_id, limit))

    messages = cur.fetchall()
    cur.close()
    conn.close()

    return [{'role': r[0], 'content': r[1], 'metadata': r[2]} for r in reversed(messages)]
```

### SSE Publisher (`sse.py`)

```python
import redis.asyncio as redis
import json
import os

redis_client = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379'))

async def publish_sse_event(session_id: str, event: dict):
    """Publish SSE event to Redis for API to pick up."""
    channel = f"sse:{session_id}:events"
    await redis_client.publish(channel, json.dumps(event))
```

### Sandbox (`sandbox.py`)

```python
from e2b import Sandbox
import os

def run_in_sandbox(code: str) -> dict:
    """Execute Python code in E2B sandbox."""
    sandbox = Sandbox(api_key=os.environ.get('E2B_API_KEY'))

    try:
        execution = sandbox.run_code(code)

        return {
            'stdout': execution.logs.stdout,
            'stderr': execution.logs.stderr,
            'exit_code': execution.exit_code,
        }
    finally:
        sandbox.close()
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/workspace
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
E2B_API_KEY=e2b_...
```

---

## Implementation Order

1. **Project setup**: Python package, requirements.txt
2. **Database**: Search embeddings, save messages
3. **LLM setup**: OpenAI client configuration
4. **Query embeddings tool**: pgvector search
5. **Agent graph**: LangGraph ReAct pattern
6. **SSE publisher**: Redis integration
7. **Consumer**: RabbitMQ message handling
8. **Chat flow**: Full message → agent → SSE response
9. **Code executor**: E2B sandbox integration
10. **Agent runs**: Report generation flow
11. **Dockerfile**: Container for deployment

---

## Dependencies on Other Services

| Dependency | From | Used For |
|------------|------|----------|
| PostgreSQL | Infrastructure | Querying embeddings, saving messages |
| RabbitMQ | Infrastructure | Consuming chat/agent jobs |
| Redis | Infrastructure | Publishing SSE events |
| E2B | External | Sandboxed code execution |
| OpenAI/Anthropic | External | LLM for agent reasoning |
| Worker | PostgreSQL | Worker populates embeddings that agent queries |
| API | RabbitMQ | API publishes jobs for agent to consume |
| API | Redis | Agent publishes SSE events for API to stream |

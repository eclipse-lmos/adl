# ADL Server LangChain Python Example

This example demonstrates how to use `langchain` and `langchain-openai` in Python to connect to the `adl-server`.
It sends a simple "Hello" message to the ADL Server's OpenAI-compatible chat completions endpoint.

## Prerequisites

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.
- Python 3.8 or higher.
- `pip` package manager.

## Setup ADL Server

First, start the ADL Server using Docker Compose in the parent directory:

```bash
docker-compose up -d
```

This will start the ADL Server on port `8080`.

## Setup Python Environment

1. Ideally, create a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows, use .venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Running the Example

Execute the main script:

```bash
python main.py
```

The script will:
1. Load environment variables.
2. Initialize a `ChatOpenAI` client pointing to `http://localhost:8080/v1` (the ADL Server address).
3. Send a "Hello" message.
4. Print the response from the server.

You should see output similar to:

```
Connecting to ADL Server at http://localhost:8080/v1...
Sending message: 'Hello'
--------------------
Response from ADL Server:
Hello there! How can I help you today?
--------------------
```


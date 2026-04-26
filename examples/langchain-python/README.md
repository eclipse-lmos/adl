<!--
SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others

SPDX-License-Identifier: Apache-2.0
-->

# ADL Server LangChain Python Example

This example demonstrates how to use `langchain` and `langchain-openai` in Python to connect to the `adl-server`.
It sends a simple "Hello" message to the ADL Server's OpenAI-compatible chat completions endpoint.

## Prerequisites

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.
- Python 3.8 or higher.
- `pip` package manager.

> [!NOTE]
> On macOS, the system or Xcode-provided Python can be linked against LibreSSL.
> With `urllib3` v2 this can trigger `NotOpenSSLWarning`. The example pins
> `urllib3<2` as a compatibility workaround. For the best long-term setup, use
> a Python build linked against OpenSSL, for example via Homebrew or `pyenv`.

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

If you previously created `.venv` with a LibreSSL-based interpreter and want to
switch to an OpenSSL-based Python, remove and recreate the virtual environment:

```bash
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

Optional: verify which SSL implementation your interpreter uses:

```bash
python -c "import ssl; print(ssl.OPENSSL_VERSION)"
```

## Running the Example

Execute the main script:

```bash
python main.py
```

By default, the script sends the `x-session-id` header. To disable it, run:

```bash
python main.py --x-session disabled
```

The script will:
1. Load environment variables.
2. Initialize a `ChatOpenAI` client pointing to `http://localhost:8080/v1` (the ADL Server address).
3. Send the `x-session-id` header unless it is disabled via `--x-session disabled`.
4. Send a "Hello" message.
5. Print the response from the server.

You should see output similar to:

```
Connecting to ADL Server at http://localhost:8080/v1...
Sending message: 'Hello'
--------------------
Response from ADL Server:
Hello there! How can I help you today?
--------------------
```


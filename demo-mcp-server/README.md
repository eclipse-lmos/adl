# Demo MCP Server

This subproject provides a small Python MCP server with a single tool: `get_car_deals`.
The tool returns a formatted string listing curated demo car deals and supports optional filtering by maximum price.

## Requirements

- Python 3.10 or newer
- `pip`

## Install

```bash
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

If your default `python3` is already 3.10+, you can use that instead of `python3.13`.

## Run

### Stdio transport

```bash
PYTHONPATH=src python -m demo_mcp_server --transport stdio
```

### Streamable HTTP transport

```bash
PYTHONPATH=src python -m demo_mcp_server --transport streamable-http --host 127.0.0.1 --port 8088
```

The MCP endpoint is exposed at `http://127.0.0.1:8088/mcp`.
A health endpoint is available at `http://127.0.0.1:8088/health`.

## Tool

### `get_car_deals`

Optional arguments:

- `price_range`: Maximum price in EUR
- `sell_current_car`: Optional flag to mention trade-in support in the result text

Returned content:

- A formatted string that lists matching car deals
- Every listed deal contains at least `id`, `brand`, `model`, `price_eur`, and `year`

Example output:

```text
Available car deals:
- {"id": "deal-vw-id3-2024", "brand": "Volkswagen", "model": "ID.3 Pro", "price_eur": 31990, "year": 2024}
```

## Tests

```bash
PYTHONPATH=src python -m unittest discover -s tests -v
```

## Docker

Build the image:

```bash
docker build -t demo-mcp-server .
```

Run it on port `8088`:

```bash
docker run --rm -p 8088:8088 demo-mcp-server
```

Build and push the GHCR image:

```bash
./build-and-push.sh
```

Build without pushing:

```bash
./build-and-push.sh --skip-push --tag local-test
```

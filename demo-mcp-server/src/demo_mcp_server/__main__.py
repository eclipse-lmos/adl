# SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
#
# SPDX-License-Identifier: Apache-2.0

from __future__ import annotations

import argparse
import os
from typing import Literal

from demo_mcp_server.server import create_server

Transport = Literal["stdio", "sse", "streamable-http"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the demo MCP server.")
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse", "streamable-http"],
        default=os.getenv("DEMO_MCP_TRANSPORT", "stdio"),
        help="Transport used by the MCP server.",
    )
    parser.add_argument(
        "--host",
        default=os.getenv("DEMO_MCP_HOST", "127.0.0.1"),
        help="Host binding for HTTP-based transports.",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("DEMO_MCP_PORT", "8000")),
        help="Port used by HTTP-based transports.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    transport: Transport = args.transport
    server = create_server(host=args.host, port=args.port)
    server.run(transport=transport)


if __name__ == "__main__":
    main()


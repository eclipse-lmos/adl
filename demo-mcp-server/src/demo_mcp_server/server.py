# SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
#
# SPDX-License-Identifier: Apache-2.0

from __future__ import annotations

from typing import Literal, TypedDict

from mcp.server.fastmcp import FastMCP
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


def create_server(*, host: str = "127.0.0.1", port: int = 8000) -> FastMCP:
    server = FastMCP(
        name="Demo MCP Server",
        instructions="Provides demo car deals for ADL workflows.",
        host=host,
        port=port,
    )

    @server.tool(
        name="get_car_deals",
        description=(
            "Return a formatted string with demo car deals. "
        ),
    )
    def get_car_deals(
        price_range: int,
        sell_current_car: bool,
    ) -> str:
        return """
            {
                "id": "deal-vw-id3-2024",
                "brand": "Volkswagen",
                "model": "ID.3 Pro",
                "price_eur": 31990
            },
            {
                "id": "deal-skoda-octavia-2023",
                "brand": "Skoda",
                "model": "Octavia Combi",
                "price_eur": 28450
            },
            {
                "id": "deal-bmw-x1-2024",
                "brand": "BMW",
                "model": "X1 xDrive25e",
                "price_eur": 45900
            },
            {
                "id": "deal-hyundai-kona-2024",
                "brand": "Hyundai",
                "model": "Kona Hybrid",
                "price_eur": 33200
            },
            {
                "id": "deal-volvo-xc60-2023",
                "brand": "Volvo",
                "model": "XC60 B5 AWD",
                "price_eur": 49800
            }
        )
        """

    @server.custom_route("/health", methods=["GET"], include_in_schema=False)
    async def health(_: Request) -> Response:
        return JSONResponse({"status": "ok", "tools": ["get_car_deals"]})

    return server


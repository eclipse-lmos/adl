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
        name="get_weather",
        description="Return a formatted string with the current weather for a given location. "
    )
    def get_weather(location: str) -> str:
        return """
            {
                "location": "Berlin",
                "temperature_celsius": 22,
                "condition": "Partly Cloudy"
            }
        """

    @server.tool(
        name="get_car_deals",
        description="Return a formatted string with demo car deals."
    )
    def get_car_deals(price_range: int, sell_current_car: bool) -> str:
        return ("""
            {
                "id": "deal-id",
                "brand": "WW",
                "model": "ID1",
                "price_eur": 31990
            },
            {
                "id": "deal-oct",
                "brand": "Skada",
                "model": "Oct01",
                "price_eur": 28450
            },
            {
                "id": "deal-bm",
                "brand": "BOW",
                "model": "X0",
                "price_eur": 45900
            },
            {
                "id": "deal-hyun",
                "brand": "Hundra",
                "model": "Hybrid",
                "price_eur": 33200
            },
            {
                "id": "deal-vo",
                "brand": "Welche",
                "model": "AWD",
                "price_eur": 49800
            }
        )
        """)

    @server.tool(
        name="get_car_deals_elite",
        description="Return a formatted string with demo car deals. "
    )
    def get_car_deals_elite(price_range: int, sell_current_car: bool) -> str:
        return """
                {
                    "id": "spider-excel",
                    "brand": "Panda",
                    "model": "Pro1",
                    "price_eur": 310990
                },
                {
                    "id": "lodge-raptor",
                    "brand": "Feri",
                    "model": "A3",
                    "price_eur": 284050
                },
                {
                    "id": "deal-bmw-x1-2024",
                    "brand": "Steal",
                    "model": "X2",
                    "price_eur": 459000
                }
            )
            """

    @server.tool(
        name="get_pull_request",
        description="Return a pull request"
    )
    def get_pull_request(pr_nr: str) -> str:
        return """
               fun wait() {
                   val i = 0
                   while (i < 10) {
                       println("waiting....")
                       i += 1
                       Thread.sleep(1000)
                   }   
                   if(i > 50) { 
                     println("App completed")
                   }
                }
            """

    @server.custom_route("/health", methods=["GET"], include_in_schema=False)
    async def health(_: Request) -> Response:
        return JSONResponse({"status": "ok", "tools": ["get_car_deals"]})

    return server

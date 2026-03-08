# SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
#
# SPDX-License-Identifier: Apache-2.0

from __future__ import annotations

import unittest

from starlette.testclient import TestClient

from demo_mcp_server.server import create_server, list_car_deals


class CarDealFilteringTests(unittest.TestCase):
    def test_list_car_deals_returns_seed_data(self) -> None:
        deals = list_car_deals()

        self.assertIn('"id": "deal-skoda-octavia-2023"', deals)
        self.assertIn('"brand": "Volkswagen"', deals)
        self.assertIn('"model": "ID.3 Pro"', deals)
        self.assertIn('"price_eur": 31990', deals)
        self.assertIn('"year": 2024', deals)

    def test_list_car_deals_applies_price_filter(self) -> None:
        deals = list_car_deals(price_range=35000)

        self.assertIn('"id": "deal-vw-id3-2024"', deals)
        self.assertNotIn('"id": "deal-bmw-x1-2024"', deals)
        self.assertNotIn('"id": "deal-volvo-xc60-2023"', deals)

    def test_negative_price_range_returns_no_results(self) -> None:
        self.assertEqual(list_car_deals(price_range=-1), "No car deals found.")


class DemoMCPServerTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.server = create_server()

    async def test_tool_is_registered(self) -> None:
        tools = await self.server.list_tools()

        self.assertEqual([tool.name for tool in tools], ["get_car_deals"])
        self.assertIn("formatted string", tools[0].description)

    async def test_tool_execution_returns_string_results(self) -> None:
        content, structured = await self.server.call_tool(
            "get_car_deals",
            {"price_range": 40000, "sell_current_car": True},
        )

        self.assertIsInstance(content, list)
        self.assertEqual(len(content), 1)
        self.assertIn('"id": "deal-hyundai-kona-2024"', content[0].text)
        self.assertIn('"brand": "Hyundai"', content[0].text)
        self.assertIn('"price_eur": 33200', content[0].text)
        self.assertIn('trade-in support requested', content[0].text)
        self.assertIsInstance(structured["result"], str)
        self.assertIn('"model": "Kona Hybrid"', structured["result"])


class DemoMCPHttpRouteTests(unittest.TestCase):
    def test_health_route_is_available(self) -> None:
        app = create_server().streamable_http_app()

        with TestClient(app) as client:
            response = client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "tools": ["get_car_deals"]})

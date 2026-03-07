# SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
#
# SPDX-License-Identifier: Apache-2.0

import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

# Load environment variables if .env file exists
load_dotenv()

# Configuration for ADL Server
ADL_SERVER_URL = os.getenv("ADL_SERVER_URL", "http://localhost:8080/v1")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "dummy-key")  # API key is required by the client but will be ignored by the server
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-4o")

def main():
    print(f"Connecting to ADL Server at {ADL_SERVER_URL}...")

    # Initialize the ChatOpenAI client pointing to the ADL Server, for example: http://localhost:8080/v1
    chat = ChatOpenAI(base_url=ADL_SERVER_URL, api_key=OPENAI_API_KEY, model=MODEL_NAME,temperature=0.7)

    # Create a simple message
    messages = [HumanMessage(content="Hello ADL")]

    try:
        # Send the message to the server
        print("Sending message: 'Hello'")
        response = chat.invoke(messages)

        # Print the response
        print("-" * 20)
        print("Response from ADL Server:")
        print(response.content)
        print("-" * 20)

    except Exception as e:
        print(f"Error communicating with ADL Server: {e}")

if __name__ == "__main__":
    main()


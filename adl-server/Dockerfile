# SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
#
# SPDX-License-Identifier: Apache-2.0

FROM gradle:9-jdk-25-and-25-corretto AS build
# Install necessary tools found in build scripts (xargs is often missing in minimal images)
RUN if command -v microdnf > /dev/null; then \
        microdnf install -y findutils; \
    elif command -v yum > /dev/null; then \
        yum install -y findutils; \
    elif command -v apt-get > /dev/null; then \
        apt-get update && apt-get install -y findutils; \
    fi
WORKDIR /home/gradle/project
COPY --chown=gradle:gradle . .
# Ensure gradlew is executable
RUN chmod +x gradlew
# Skip tests to speed up the build
RUN ./gradlew :adl-server:installDist --no-daemon -x test

FROM amazoncorretto:25
WORKDIR /app
COPY --from=build /home/gradle/project/adl-server/build/install/adl-server/ /app/
EXPOSE 8080
ENTRYPOINT ["/app/bin/adl-server"]

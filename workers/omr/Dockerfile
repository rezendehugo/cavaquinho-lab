# SPDX-License-Identifier: AGPL-3.0-only
FROM eclipse-temurin:21-jre AS audiveris
ARG AUDIVERIS_VERSION=5.7.1
RUN useradd --create-home worker
USER worker
WORKDIR /home/worker
# The release archive is injected by the build pipeline after legal/version review.
COPY --chown=worker:worker vendor/audiveris-${AUDIVERIS_VERSION}/ /opt/audiveris/

FROM python:3.12-slim
RUN useradd --create-home worker
COPY --from=audiveris /opt/audiveris /opt/audiveris
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
USER worker
WORKDIR /work
COPY --chown=worker:worker normalize.py /app/normalize.py
ENTRYPOINT ["python", "/app/normalize.py"]

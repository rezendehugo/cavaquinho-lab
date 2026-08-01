# SPDX-License-Identifier: AGPL-3.0-only
FROM ubuntu:22.04 AS base

ARG AUDIVERIS_VERSION=5.10.2
ARG AUDIVERIS_SHA256=9470d15e79dd4fe45f817b8545ba9f8e57ddaebff3b3a1031f21218647602068
ARG TESSDATA_VERSION=4.1.0
ARG TESSDATA_ENG_SHA256=daa0c97d651c19fba3b25e81317cd697e9908c8208090c94c3905381c23fc047
ARG TESSDATA_POR_SHA256=016c6a371bb1e4c48fe521908cf3ba3d751fade0ab846ad5d4086b563f5c528c

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl python3 python3-pip python3-venv \
      fontconfig fonts-dejavu-core libasound2 libx11-6 libxext6 libxi6 libxrender1 libxtst6 \
    && curl --fail --location --output /tmp/audiveris.deb \
      "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-ubuntu22.04-x86_64.deb" \
    && echo "${AUDIVERIS_SHA256}  /tmp/audiveris.deb" | sha256sum --check --strict \
    && dpkg-deb --extract /tmp/audiveris.deb / \
    && useradd --create-home worker \
    && mkdir -p /home/worker/.config/AudiverisLtd/audiveris \
    && mkdir -p /opt/tessdata \
    && curl --fail --location --output /opt/tessdata/eng.traineddata \
      "https://raw.githubusercontent.com/tesseract-ocr/tessdata/${TESSDATA_VERSION}/eng.traineddata" \
    && curl --fail --location --output /opt/tessdata/por.traineddata \
      "https://raw.githubusercontent.com/tesseract-ocr/tessdata/${TESSDATA_VERSION}/por.traineddata" \
    && echo "${TESSDATA_ENG_SHA256}  /opt/tessdata/eng.traineddata" | sha256sum --check --strict \
    && echo "${TESSDATA_POR_SHA256}  /opt/tessdata/por.traineddata" | sha256sum --check --strict \
    && ln -s /opt/tessdata /home/worker/.config/AudiverisLtd/audiveris/tessdata \
    && chown -R worker:worker /home/worker/.config \
    && rm -rf /var/lib/apt/lists/* /tmp/audiveris.deb

COPY requirements.txt /tmp/requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt

COPY --chown=worker:worker normalize.py pipeline.py server.py test_pipeline.py test_corpus.py /app/
ENV AUDIVERIS_COMMAND=/opt/audiveris/bin/Audiveris
ENV AUDIVERIS_VERSION=5.10.2
ENV PATH=/opt/venv/bin:$PATH
EXPOSE 8090

FROM base AS dev
RUN /opt/venv/bin/pip install --no-cache-dir watchfiles==1.1.1
COPY --chown=worker:worker dev_server.py /app/dev_server.py
USER worker
WORKDIR /work
ENTRYPOINT ["python", "/app/dev_server.py"]

FROM base AS runtime
USER worker
WORKDIR /work
ENTRYPOINT ["python", "/app/server.py"]

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
if (endpoint) {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({ 'service.name': 'cavaquinho-lab-api', 'service.version': process.env.APP_VERSION ?? 'development', 'deployment.environment.name': process.env.APP_ENV ?? 'development' }),
    traceExporter: new OTLPTraceExporter({ url: `${endpoint.replace(/\/$/, '')}/v1/traces`, headers: process.env.OTEL_EXPORTER_OTLP_HEADERS ? Object.fromEntries(process.env.OTEL_EXPORTER_OTLP_HEADERS.split(',').map(item => item.split('='))) : {} }),
    instrumentations: [getNodeAutoInstrumentations({ '@opentelemetry/instrumentation-fs': { enabled: false } })]
  });
  sdk.start();
  process.once('SIGTERM', () => sdk.shutdown());
}

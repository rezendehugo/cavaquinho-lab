export function createProductApi(request) {
  return {
    me: () => request('/v1/me'),
    listSequences: () => request('/v1/sequences'),
    createSequence: sequence => request('/v1/sequences', { method: 'POST', body: JSON.stringify(sequence) }),
    updateSequence: sequence => request(`/v1/sequences/${sequence.id}`, { method: 'PATCH', body: JSON.stringify(sequence) }),
    deleteSequence: id => request(`/v1/sequences/${id}`, { method: 'DELETE' }),
    migrateLocal: sequences => request('/v1/sequences/migrate-local', { method: 'POST', body: JSON.stringify({ sequences }) }),
    createCheckout: price => request('/v1/billing/checkout', { method: 'POST', body: JSON.stringify({ price }) }),
    openPortal: () => request('/v1/billing/portal', { method: 'POST' }),
    deleteAccount: confirmation => request('/v1/me', { method: 'DELETE', body: JSON.stringify({ confirmation }) })
  };
}

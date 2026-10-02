export default function FeatureUnavailablePage() {
  return <section className="feature-unavailable panel" aria-labelledby="feature-unavailable-title">
    <p className="eyebrow">Em preparação</p><h2 id="feature-unavailable-title">Importação de partitura ainda não está disponível</h2>
    <p>Enquanto preparamos o reconhecimento com segurança, você pode montar a sequência manualmente e já criar seu mapa de estudo.</p>
    <a className="primary-button" href="sequences">Criar sequência manualmente</a>
  </section>;
}

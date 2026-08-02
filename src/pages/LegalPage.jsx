const content = {
  terms: ['Termos de uso', 'O Cavaquinho Lab é uma ferramenta de estudo. Diagramas e sugestões devem ser conferidos pelo músico. A conta é pessoal e não pode ser usada para violar direitos de terceiros.'],
  privacy: ['Privacidade', 'Guardamos dados da conta, sequências, sessões de prática e estado da assinatura. Não usamos conteúdo musical privado para treinamento. Você pode solicitar a exclusão pela página Conta.'],
  cancellation: ['Cancelamento', 'A assinatura pode ser cancelada no portal de cobrança. O acesso Pro permanece até o fim do período pago e não há renovação após o cancelamento.'],
  contact: ['Contato', 'Use o canal de suporte publicado no repositório para dúvidas, privacidade ou cobrança. Nunca envie senhas, tokens ou documentos musicais privados por mensagem pública.']
};

export default function LegalPage({ type }) {
  const [title, body] = content[type] || content.terms;
  return <article className="legal-page"><p className="eyebrow">Cavaquinho Lab</p><h1>{title}</h1><p>{body}</p><p>Versão inicial · agosto de 2026. Este texto deve passar por revisão jurídica antes da venda pública.</p></article>;
}

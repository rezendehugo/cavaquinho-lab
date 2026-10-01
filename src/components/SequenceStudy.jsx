import { studyFields } from '../domain/sequenceStudy';

export function StudyIntention({ study, onChange }) {
  return <section className="study-intention" aria-labelledby="study-intention-title">
    <div><p className="eyebrow">01 · Definir uma intenção</p><h2 id="study-intention-title">Um foco para esta prática</h2><p>Escolha uma mudança que você consiga ouvir ou sentir. Comece devagar e observe o resultado.</p></div>
    <label><span>{studyFields[0].label}</span><textarea rows="2" maxLength="1600" value={study.intention} onChange={event => onChange('intention', event.target.value)} placeholder={studyFields[0].placeholder} /></label>
  </section>;
}

export function StudyReflection({ study, onChange, onRecord, status, exercises, disabled }) {
  return <section className="study-reflection" aria-labelledby="reflection-title">
    <header className="study-section-heading"><div><p className="eyebrow">03 · Observar, conectar e ajustar</p><h2 id="reflection-title">O que esta prática ensinou?</h2><p>Uma tentativa gera informação. Use essa informação para escolher a próxima.</p></div><span className="study-count">{study.sessions.length} {study.sessions.length === 1 ? 'sessão registrada' : 'sessões registradas'}</span></header>
    <div className="reflection-layout">
      <section className="study-questions" aria-labelledby="questions-title"><h3 id="questions-title">Escute antes de conferir</h3><p>Toque, formule sua hipótese e compare com a leitura sugerida. A função depende do contexto musical.</p>{exercises.slice(0, 4).map(exercise => <div className="study-question" key={exercise.title}><h4>{exercise.prompt}</h4><details><summary>Conferir uma pista</summary><p>{exercise.answer}</p></details></div>)}</section>
      <div className="study-journal">{studyFields.slice(1).map(field => <label key={field.key}><span>{field.label}</span><textarea rows="2" maxLength="1600" value={study[field.key]} onChange={event => onChange(field.key, event.target.value)} placeholder={field.placeholder} /></label>)}
        <button type="button" data-ui-text-reason="workflow" disabled={disabled || !study.observation.trim()} onClick={onRecord}>Registrar esta sessão</button>
        <p className="study-save-status" role="status">{status || 'Anotações neste navegador, por sequência. Incluídas no guia PDF.'}</p>
      </div>
    </div>
    {study.sessions.length > 0 ? <details className="study-history"><summary>{study.sessions.length === 1 ? 'Revisitar minha última sessão' : `Revisitar minhas últimas ${study.sessions.length} sessões`}</summary><p>Compare clareza, conforto e continuidade, além do andamento. Até 20 sessões ficam guardadas neste navegador.</p><ol>{study.sessions.map((session, index) => <li key={`${session.date}-${index}`}><strong>{new Date(session.date).toLocaleDateString('pt-BR')} · {session.bpm} BPM</strong>{studyFields.map(({ key, label }) => session[key] ? <p key={key}><b>{label}</b> {session[key]}</p> : null)}</li>)}</ol></details> : null}
  </section>;
}

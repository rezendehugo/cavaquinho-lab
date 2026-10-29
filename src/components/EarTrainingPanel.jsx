import { useEffect, useRef, useState } from 'react';
import { earTrainingLevels, createEarTrainingExercise, createSequenceRecallExercise, earTrainingProgressKey, sequenceEarReviewKey, normalizeEarTrainingProgress, normalizeSequenceEarReviews, updateEarTrainingProgress, updateSequenceEarReview, getRecommendedEarTrainingLevel } from '../domain/earTraining';
import { loadSequences, readStorage, writeStorage } from '../storage';
import { playEarTrainingRounds } from '../features/ear-training/audio';

function loadProgress() {
  try { return normalizeEarTrainingProgress(JSON.parse(readStorage(earTrainingProgressKey).value)); }
  catch { return normalizeEarTrainingProgress(null); }
}
function loadSequenceReviews() {
  try { return normalizeSequenceEarReviews(JSON.parse(readStorage(sequenceEarReviewKey).value)); }
  catch { return {}; }
}

export default function EarTrainingPanel() {
  const [levelId, setLevelId] = useState(earTrainingLevels[0].id);
  const [exercise, setExercise] = useState(() => createEarTrainingExercise(earTrainingLevels[0].id));
  const [feedback, setFeedback] = useState(null);
  const [progress, setProgress] = useState(loadProgress);
  const [sequences] = useState(loadSequences);
  const [sequenceId, setSequenceId] = useState(() => loadSequences()[0]?.id || '');
  const [sequenceReviews, setSequenceReviews] = useState(loadSequenceReviews);
  const [streak, setStreak] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioMessage, setAudioMessage] = useState('Ouça quantas vezes precisar antes de responder.');
  const audioContextRef = useRef(null);
  const audioTimeoutRef = useRef(null);
  const level = earTrainingLevels.find(item => item.id === levelId) || earTrainingLevels[0];
  const recommendedLevel = getRecommendedEarTrainingLevel(progress);
  const stats = progress[levelId];

  useEffect(() => () => {
    window.clearTimeout(audioTimeoutRef.current);
    audioContextRef.current?.close();
  }, []);

  const resetRound = nextLevelId => {
    window.clearTimeout(audioTimeoutRef.current);
    audioContextRef.current?.close();
    audioContextRef.current = null;
    setAudioPlaying(false);
    setAudioMessage('Ouça quantas vezes precisar antes de responder.');
    setFeedback(null);
    setStreak(0);
    setLevelId(nextLevelId);
    const savedSequence = sequences.find(item => item.id === sequenceId);
    setExercise(nextLevelId === 'sequence' ? createSequenceRecallExercise(savedSequence) : createEarTrainingExercise(nextLevelId));
  };

  const playAudio = async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Seu navegador não oferece reprodução de áudio neste modo.');
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') audioContextRef.current = new AudioContext();
      await audioContextRef.current.resume();
      const rounds = feedback ? exercise.answerAudioRounds || exercise.audioRounds : exercise.audioRounds;
      const duration = playEarTrainingRounds(audioContextRef.current, rounds);
      window.clearTimeout(audioTimeoutRef.current);
      setAudioPlaying(true);
      setAudioMessage('Trecho em reprodução. Escute o movimento dos acordes.');
      audioTimeoutRef.current = window.setTimeout(() => {
        setAudioPlaying(false);
        setAudioMessage('Trecho concluído. Escute de novo se quiser.');
      }, duration);
    } catch {
      setAudioMessage('Não foi possível iniciar o áudio. Tente novamente ou use outro navegador.');
    }
  };

  const submitAnswer = optionId => {
    if (feedback) return;
    const correct = optionId === exercise.answerId;
    const nextStreak = correct ? streak + 1 : 0;
    const nextProgress = updateEarTrainingProgress(progress, levelId, correct, nextStreak);
    setStreak(nextStreak);
    setProgress(nextProgress);
    setFeedback({ correct, optionId });
    writeStorage(earTrainingProgressKey, JSON.stringify(nextProgress));
    if (levelId === 'sequence' && exercise.sequenceId) {
      const nextReviews = updateSequenceEarReview(sequenceReviews, exercise.sequenceId, correct);
      setSequenceReviews(nextReviews);
      writeStorage(sequenceEarReviewKey, JSON.stringify(nextReviews));
    }
  };

  const nextExercise = () => {
    window.clearTimeout(audioTimeoutRef.current);
    audioContextRef.current?.close();
    audioContextRef.current = null;
    setAudioPlaying(false);
    setAudioMessage('Ouça quantas vezes precisar antes de responder.');
    setFeedback(null);
    const savedSequence = sequences.find(item => item.id === sequenceId);
    setExercise(levelId === 'sequence' ? createSequenceRecallExercise(savedSequence) : createEarTrainingExercise(levelId));
  };

  const selectSavedSequence = id => {
    setSequenceId(id);
    setFeedback(null);
    setExercise(createSequenceRecallExercise(sequences.find(item => item.id === id)));
  };

  const dueCount = sequences.filter(item => {
    const review = sequenceReviews[item.id];
    return review && Date.parse(review.dueAt) <= Date.now();
  }).length;

  return <section className="panel ear-training-panel" aria-labelledby="ear-training-title">
    <header className="ear-training-hero">
      <div><p className="eyebrow">Escutar · imaginar · tocar</p><h2 id="ear-training-title">Treino de ouvido</h2><p>Primeiro reconheça a sensação e a função. Os nomes e a teoria aparecem depois da sua tentativa.</p><button className="ear-training-recommended" type="button" data-ui-text-reason="workflow" onClick={() => resetRound(recommendedLevel.id)}>Seguir trilha: {recommendedLevel.label}</button></div>
    </header>

    <nav className="ear-training-levels" aria-label="Etapas do treino auditivo">
      {earTrainingLevels.map((item, index) => <button key={item.id} type="button" data-ui-text-reason="domain-choice" aria-pressed={levelId === item.id} onClick={() => resetRound(item.id)}>
        <span>{index + 1}</span><strong>{item.label}</strong><small>{progress[item.id].correct}/{progress[item.id].attempts} acertos</small>
      </button>)}
    </nav>

    <div className="ear-training-round">
      <div className="ear-training-round-heading"><div><p className="eyebrow">Etapa {earTrainingLevels.findIndex(item => item.id === levelId) + 1} de {earTrainingLevels.length}</p><h3>{level.title}</h3><p>{level.description}</p></div><p className="ear-training-score" aria-label={`Acertos ${stats.correct} de ${stats.attempts}; melhor sequência ${stats.bestStreak}`}>Acertos {stats.correct}/{stats.attempts}<br />Sequência {streak} · melhor {stats.bestStreak}</p></div>

      {levelId === 'sequence' ? <div className="ear-sequence-picker"><label htmlFor="ear-saved-sequence">Sequência salva</label><select id="ear-saved-sequence" value={sequenceId} onChange={event => selectSavedSequence(event.target.value)}>{sequences.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select><p>{dueCount ? `${dueCount} sequência${dueCount === 1 ? '' : 's'} para revisar agora.` : 'A próxima revisão espaçada aparecerá aqui quando chegar a hora.'}</p></div> : null}
      {exercise ? <>
        <p className="ear-training-question" id="ear-training-question">{exercise.prompt}</p>
        <button type="button" data-ui-text-reason="workflow" aria-label={audioPlaying ? 'Ouvindo áudio' : feedback && levelId === 'prediction' ? 'Ouvir resolução' : 'Ouvir trecho'} title={audioPlaying ? 'Ouvindo áudio' : feedback && levelId === 'prediction' ? 'Ouvir resolução' : 'Ouvir trecho'} className="ear-training-listen" onClick={playAudio} disabled={audioPlaying} aria-describedby="ear-training-audio-status">{audioPlaying ? 'Ouvindo…' : feedback && levelId === 'prediction' ? 'Ouvir resolução' : 'Ouvir trecho'}</button>
        <p className="visually-hidden" id="ear-training-audio-status" role="status" aria-live="polite">{audioMessage}</p>
        <div className="ear-training-options" role="group" aria-labelledby="ear-training-question">
          {exercise.options.map(option => {
            const isAnswer = feedback && option.id === exercise.answerId;
            const isWrongChoice = feedback?.optionId === option.id && !feedback.correct;
            return <button key={option.id} type="button" data-ui-text-reason="domain-choice" aria-label={option.label} title={option.label} aria-pressed={feedback?.optionId === option.id} disabled={Boolean(feedback) || audioPlaying} className={`${isAnswer ? 'is-correct' : ''} ${isWrongChoice ? 'is-wrong' : ''}`.trim()} onClick={() => submitAnswer(option.id)}>{option.label}</button>;
          })}
        </div>
        {feedback ? <section className={`ear-training-feedback ${feedback.correct ? 'is-correct' : 'is-wrong'}`} aria-live="polite" aria-labelledby="ear-training-feedback-title">
          <h4 id="ear-training-feedback-title">{feedback.correct ? 'Boa escuta!' : 'Vamos ouvir essa relação de novo.'}</h4>
          <p>{exercise.explanation}</p><p>{exercise.transfer}</p>
          <button type="button" data-ui-text-reason="workflow" onClick={nextExercise}>Próximo desafio</button>
        </section> : <p className="ear-training-encouragement">Sem pressa: ouça, imagine o próximo movimento e só então escolha.</p>}
      </> : <p role="status">{levelId === 'sequence' && !sequences.some(item => item.steps?.length >= 2) ? 'Salve uma sequência com pelo menos dois acordes diferentes para praticar a antecipação.' : 'Não foi possível montar esta atividade com as formas de acordes disponíveis.'}</p>}
    </div>
  </section>;
}

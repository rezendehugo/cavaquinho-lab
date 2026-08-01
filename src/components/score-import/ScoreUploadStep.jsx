import { FileMusic, LockKeyhole, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import IconButton from '../IconButton';

const formatBytes = bytes => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function ScoreUploadStep({ file, error, onChoose, onClear, onSubmit }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const choose = files => onChoose(files?.[0] ?? null);

  return <section className="score-upload-step" aria-labelledby="score-upload-heading">
    <div
      className={`score-upload-dropzone${dragging ? ' is-dragging' : ''}`}
      onDragEnter={event => { event.preventDefault(); setDragging(true); }}
      onDragOver={event => event.preventDefault()}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={event => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files); }}
    >
      <span className="score-upload-icon"><FileMusic size={30} aria-hidden="true" /></span>
      <h3 id="score-upload-heading">Transforme uma partitura em prática</h3>
      <p>Arraste o arquivo para cá ou escolha no seu dispositivo.</p>
      <button type="button" data-ui-text-reason="workflow" className="primary-button" onClick={() => inputRef.current?.click()}>
        <Upload size={17} aria-hidden="true" /> Escolher arquivo
      </button>
      <input
        ref={inputRef}
        aria-label="Escolher PDF, MusicXML ou MXL"
        type="file"
        accept=".pdf,.mxl,.musicxml,.xml,application/pdf,application/vnd.recordare.musicxml,application/xml,text/xml"
        onChange={event => { choose(event.target.files); event.target.value = ''; }}
      />
      <div className="score-upload-facts" aria-label="Requisitos do arquivo">
        <span>PDF · MusicXML · MXL</span><span>Até 20 MB</span><span>Até 20 páginas</span>
        <span><LockKeyhole size={13} aria-hidden="true" /> Arquivo privado</span>
      </div>
    </div>
    {error ? <div className="score-inline-error" role="alert"><CircleError /> <span>{error}</span></div> : null}
    {file ? <div className="score-selected-file">
      <FileMusic size={21} aria-hidden="true" />
      <div><strong>{file.name}</strong><span>{formatBytes(file.size)} · pronto para enviar</span></div>
      <IconButton label="Trocar arquivo" onClick={onClear}><X size={17} /></IconButton>
      <button type="button" data-ui-text-reason="workflow" className="primary-button" onClick={onSubmit}>Enviar partitura</button>
    </div> : null}
  </section>;
}

function CircleError() {
  return <span className="score-error-symbol" aria-hidden="true">!</span>;
}

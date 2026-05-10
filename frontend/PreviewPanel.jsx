/* global React, Card, Pill */
const { useRef, useState } = React;

const API = 'http://127.0.0.1:8000';

function PreviewPanel({ completed, taskId, lang, progress }) {
  const videoRef = useRef(null);

  function download(type) {
    if (!taskId || !completed) return;
    const urls = {
      video:      `${API}/tasks/${taskId}/download/video`,
      srt:        `${API}/tasks/${taskId}/download/srt`,
      transcript: `${API}/tasks/${taskId}/download/transcript`,
    };
    const a = document.createElement('a');
    a.href = urls[type];
    a.download = type === 'video' ? 'output.mp4' : type === 'srt' ? 'output.srt' : 'transcript.txt';
    a.click();
  }

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%', boxSizing: 'border-box' }}>

      {/* ── 标题 ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🎬</span>
          <h6 style={{ fontFamily: 'var(--font-sans-cjk)', margin: 0, fontSize: 16 }}>合成监看</h6>
        </div>
        {completed
          ? <Pill tone="success">✅ 已完成</Pill>
          : <Pill tone="pending">等待完成</Pill>
        }
      </div>

      {/* ── 9:16 视频区域 ─────────────────────────── */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '9 / 16',
        background: '#0D0B08',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--ink-200)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      }}>
        {completed ? (
          <video
            ref={videoRef}
            controls
            preload="metadata"
            style={{
              width: '100%', height: '100%',
              objectFit: 'contain', display: 'block',
              background: '#000',
            }}
            src={`${API}/tasks/${taskId}/download/video`}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
            color: 'var(--ink-400)',
          }}>
            <span style={{ fontSize: 48, opacity: 0.5 }}>🎞️</span>
            <span style={{ fontFamily: 'var(--font-sans-cjk)', fontSize: 14, textAlign: 'center', padding: '0 24px' }}>
              {progress > 0 ? '处理中，稍候…' : '翻译完成后\n可在此预览'}
            </span>
            {progress > 0 && (
              <div style={{ width: '60%', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  width: `${progress}%`, height: '100%',
                  background: 'var(--accent)', borderRadius: 999,
                  transition: 'width 0.5s var(--ease-out)',
                }}/>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 下载列表 ──────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { ico: '🎞️', name: 'output.mp4',    desc: '翻译视频',      type: 'video' },
          { ico: '📝', name: 'output.srt',     desc: 'SRT 字幕',      type: 'srt' },
          { ico: '📄', name: 'transcript.txt', desc: '原文 / 译文对照', type: 'transcript' },
        ].map((f) => (
          <div key={f.type} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            background: completed ? 'var(--ink-50)' : 'var(--ink-100)',
            border: '1px solid var(--ink-150)',
            opacity: completed ? 1 : 0.5,
            transition: 'opacity var(--dur-base)',
          }}>
            <span style={{ fontSize: 17 }}>{f.ico}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 1 }}>{f.desc}</div>
            </div>
            <button
              disabled={!completed}
              onClick={() => download(f.type)}
              title={`下载 ${f.name}`}
              style={{
                border: 'none', background: 'transparent',
                cursor: completed ? 'pointer' : 'not-allowed',
                padding: 4, color: completed ? 'var(--accent)' : 'var(--ink-300)',
                flexShrink: 0,
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* ── 完成信息 ──────────────────────────────── */}
      {completed && (
        <div style={{
          background: 'var(--success-soft)', border: '1px solid #BFE2CD',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          color: '#1F6A40', fontSize: 12, lineHeight: 1.7,
        }}>
          <b style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>✅ 翻译完成</b>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#2D7A4E' }}>
            <div>task_id: <span style={{ color: '#1F6A40', fontWeight: 600 }}>{taskId}</span></div>
            <div>language: {lang}</div>
            <div>output_dir: ./outputs/{taskId}</div>
          </div>
        </div>
      )}

    </Card>
  );
}

window.PreviewPanel = PreviewPanel;

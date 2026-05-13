/* global React, Card */
/* HistoryPanel — 任务历史模态框
   功能：列表展示 / 视频预览 / 文件下载 / 删除历史 */

const { useState, useEffect, useRef } = React;
const _API = window.location.origin;

// ── 工具函数 ──────────────────────────────────────────────────

function fmtDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch(_e) { return isoStr; }
}

function TaskListItem({ item, selected, onClick }) {
  const isSelected = selected?.task_id === item.task_id;
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        background: isSelected ? 'var(--accent-soft)' : 'transparent',
        border: isSelected ? '1px solid var(--accent-ring)' : '1px solid transparent',
        transition: 'background var(--dur-base)',
        marginBottom: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: isSelected ? 'var(--accent)' : 'var(--ink-700)',
          fontWeight: 600,
        }}>
          {item.task_id}
        </span>
        {item.target_language && (
          <span style={{
            fontSize: 10, padding: '1px 6px',
            background: isSelected ? 'rgba(230,106,61,0.12)' : 'var(--ink-100)',
            color: isSelected ? 'var(--accent)' : 'var(--ink-600)',
            borderRadius: 999, flexShrink: 0,
          }}>
            {item.target_language}
          </span>
        )}
      </div>
      {item.input_filename && (
        <div style={{
          fontSize: 11, color: 'var(--ink-500)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 2,
        }}>
          {item.input_filename}
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--ink-400)' }}>
        {fmtDate(item.completed_at)}
      </div>
    </div>
  );
}

function DownloadRow({ label, desc, url, filename, disabled }) {
  function handleDownload() {
    if (disabled) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 12px',
      borderRadius: 'var(--radius-md)',
      background: disabled ? 'var(--ink-100)' : 'var(--ink-50)',
      border: '1px solid var(--ink-150)',
      opacity: disabled ? 0.45 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filename}</div>
        <div style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 1 }}>{desc}</div>
      </div>
      <button
        disabled={disabled}
        onClick={handleDownload}
        title={label}
        style={{
          border: 'none', background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: 4, color: disabled ? 'var(--ink-300)' : 'var(--accent)',
          flexShrink: 0,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>
    </div>
  );
}

function DetailPane({ item, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const videoRef = useRef(null);

  // 切换任务时重置确认状态
  useEffect(() => { setConfirming(false); }, [item?.task_id]);

  if (!item) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--ink-400)', gap: 12,
      }}>
        <span style={{ fontFamily: 'var(--font-sans-cjk)', fontSize: 14 }}>从左侧选择一条历史记录</span>
      </div>
    );
  }

  const base = `${_API}/tasks/${item.task_id}/download`;

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`${_API}/tasks/${item.task_id}/outputs`, { method: 'DELETE' });
      onDelete(item.task_id);
    } catch (e) {
      alert('删除失败: ' + e.message);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>

      {/* ── 任务信息 ─────────────────────────────────── */}
      <div style={{
        background: 'var(--ink-50)', border: '1px solid var(--ink-150)',
        borderRadius: 'var(--radius-md)', padding: '12px 14px',
        fontSize: 12, lineHeight: 1.8, color: 'var(--ink-600)',
      }}>
        <div><span style={{ color: 'var(--ink-400)', marginRight: 6 }}>task_id</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-900)', fontWeight: 600 }}>{item.task_id}</span></div>
        {item.input_filename && <div><span style={{ color: 'var(--ink-400)', marginRight: 6 }}>文件名</span>{item.input_filename}</div>}
        {item.target_language && <div><span style={{ color: 'var(--ink-400)', marginRight: 6 }}>目标语言</span>{item.target_language}</div>}
        {item.completed_at && <div><span style={{ color: 'var(--ink-400)', marginRight: 6 }}>完成时间</span>{fmtDate(item.completed_at)}</div>}
        <div><span style={{ color: 'var(--ink-400)', marginRight: 6 }}>口型同步</span>{item.lipsync_enabled ? '已启用' : '未启用'}</div>
      </div>

      {/* ── 视频预览 ─────────────────────────────────── */}
      {item.has_video ? (
        <div style={{
          width: '100%',
          background: '#0D0B08',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--ink-200)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          flexShrink: 0,
        }}>
          <video
            ref={videoRef}
            key={item.task_id}
            controls
            preload="metadata"
            style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block', background: '#000' }}
            src={`${base}/video`}
          />
        </div>
      ) : (
        <div style={{
          height: 100, background: 'var(--ink-100)', borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-400)', fontSize: 13, flexShrink: 0,
        }}>
          暂无视频文件
        </div>
      )}

      {/* ── 下载文件 ─────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 600, marginBottom: 2, paddingLeft: 2 }}>下载文件</div>
        <DownloadRow label="下载视频" desc="翻译配音视频" url={`${base}/video`} filename="output.mp4" disabled={!item.has_video}/>
        <DownloadRow label="下载字幕" desc="SRT 字幕文件" url={`${base}/srt`} filename="output.srt" disabled={!item.has_srt}/>
        <DownloadRow label="下载配音" desc="独立配音音轨" url={`${base}/audio`} filename="dubbed.mp3" disabled={!item.has_audio}/>
        <DownloadRow label="下载文稿" desc="原文 / 译文对照" url={`${base}/transcript`} filename="transcript.txt" disabled={!item.has_transcript}/>
      </div>

      {/* ── 删除按钮 ─────────────────────────────────── */}
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            style={{
              width: '100%', padding: '9px 0',
              background: 'transparent', border: '1px solid #F5B9B5',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              fontSize: 12, color: '#C0392B',
              fontFamily: 'var(--font-sans-cjk)',
              transition: 'background var(--dur-base)',
            }}
          >
            删除此记录
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setConfirming(false)}
              style={{
                flex: 1, padding: '9px 0',
                background: 'var(--ink-100)', border: '1px solid var(--ink-200)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                fontSize: 12, color: 'var(--ink-600)', fontFamily: 'var(--font-sans-cjk)',
              }}
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                flex: 1, padding: '9px 0',
                background: '#C0392B', border: 'none',
                borderRadius: 'var(--radius-md)', cursor: deleting ? 'wait' : 'pointer',
                fontSize: 12, color: '#fff', fontFamily: 'var(--font-sans-cjk)',
                opacity: deleting ? 0.7 : 1,
              }}
            >
              {deleting ? '删除中…' : '确认删除'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


function HistoryPanel({ open, onClose }) {
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (open) loadHistory();
  }, [open]);

  async function loadHistory() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${_API}/history`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = data.history || [];
      setHistory(list);
      setSelected(list[0] || null);
    } catch (e) {
      setError('无法加载历史：' + e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDelete(taskId) {
    const updated = history.filter(h => h.task_id !== taskId);
    setHistory(updated);
    // 如果被删除的是当前选中项，切换到列表第一个
    if (selected?.task_id === taskId) {
      setSelected(updated[0] || null);
    }
  }

  if (!open) return null;

  return (
    /* ── 全屏遮罩 ─────────────────────────────────────── */
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'vt-fade-in 180ms var(--ease-out)',
      }}
    >
      {/* ── 模态框主体 ────────────────────────────────── */}
      <div style={{
        width: '100%', maxWidth: 900, height: '85vh',
        background: 'var(--ink-0)',
        borderRadius: 'var(--radius-xl, 16px)',
        border: '1px solid var(--ink-150)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── 顶栏 ─────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--ink-150)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h6 style={{ fontFamily: 'var(--font-sans-cjk)', margin: 0, fontSize: 17, color: 'var(--ink-900)' }}>任务历史</h6>
            {!loading && (
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)',
                background: 'var(--ink-100)', color: 'var(--ink-500)',
                padding: '2px 8px', borderRadius: 999,
              }}>
                {history.length} 条记录
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={loadHistory}
              title="刷新列表"
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                fontSize: 13, color: 'var(--ink-600)',
              }}
            >
              刷新
            </button>
            <button
              onClick={onClose}
              style={{
                border: 'none', background: 'var(--ink-100)', cursor: 'pointer',
                padding: '6px 14px', borderRadius: 'var(--radius-md)',
                fontSize: 13, color: 'var(--ink-700)',
                fontFamily: 'var(--font-sans-cjk)',
              }}
            >
              关闭
            </button>
          </div>
        </div>

        {/* ── 内容区：左列表 + 右详情 ─────────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* 左：列表 */}
          <div style={{
            width: 240, flexShrink: 0,
            borderRight: '1px solid var(--ink-150)',
            overflowY: 'auto', padding: '12px 10px',
          }}>
            {loading && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-400)', fontSize: 13 }}>
                <div className="vt-typing" style={{ justifyContent: 'center', display: 'flex', gap: 4, marginBottom: 8 }}>
                  <span/><span/><span/>
                </div>
                加载中…
              </div>
            )}
            {!loading && error && (
              <div style={{ padding: 16, color: '#C0392B', fontSize: 12 }}>{error}</div>
            )}
            {!loading && !error && history.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-400)', fontSize: 13 }}>
                暂无历史记录
              </div>
            )}
            {!loading && history.map(item => (
              <TaskListItem
                key={item.task_id}
                item={item}
                selected={selected}
                onClick={() => setSelected(item)}
              />
            ))}
          </div>

          {/* 右：详情 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
            <DetailPane item={selected} onDelete={handleDelete} />
          </div>

        </div>
      </div>
    </div>
  );
}

window.HistoryPanel = HistoryPanel;

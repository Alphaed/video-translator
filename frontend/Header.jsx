/* global React */
const { useState } = React;

// ── Toast（底部浮现提示）────────────────────────────────────────
function Toast({ msg, ok }) {
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2000,
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--ink-0)',
      border: `1px solid ${ok ? 'var(--accent-ring)' : '#F5B9B5'}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
      padding: '11px 18px',
      minWidth: 240,
      animation: 'vt-fade-in 160ms var(--ease-out)',
      pointerEvents: 'none',
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{ok ? '✅' : '❌'}</span>
      <span style={{
        fontFamily: 'var(--font-sans-cjk)', fontSize: 13,
        color: ok ? 'var(--ink-800)' : '#C0392B',
      }}>
        {msg}
      </span>
    </div>
  );
}

// ── 清理缓存确认弹窗 ──────────────────────────────────────────
function ClearCacheModal({ onClose, onConfirmed }) {
  const [cleaning, setCleaning] = useState(false);

  async function handleConfirm() {
    setCleaning(true);
    try {
      const res  = await fetch('http://127.0.0.1:8000/cache/all', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || '清理失败');
      const msg = data.skipped > 0
        ? `已清理 ${data.deleted} 个任务，跳过 ${data.skipped} 个运行中任务`
        : `已清理 ${data.deleted} 个任务`;
      onConfirmed(msg, true);
    } catch (e) {
      onConfirmed(e.message || '清理失败', false);
    } finally {
      setCleaning(false);
      onClose();
    }
  }

  return (
    /* ── 全屏遮罩 ── */
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !cleaning) onClose(); }}
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
      {/* ── 弹窗主体 ── */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--ink-0)',
        borderRadius: 'var(--radius-xl, 16px)',
        border: '1px solid var(--ink-150)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* ── 顶栏 ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--ink-150)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🗑️</span>
            <h6 style={{
              margin: 0, fontSize: 17, fontWeight: 600,
              fontFamily: 'var(--font-sans-cjk)', color: 'var(--ink-900)',
            }}>
              清理缓存
            </h6>
          </div>
          <button
            onClick={onClose}
            disabled={cleaning}
            style={{
              border: 'none', background: 'var(--ink-100)', cursor: cleaning ? 'not-allowed' : 'pointer',
              padding: '6px 14px', borderRadius: 'var(--radius-md)',
              fontSize: 13, color: 'var(--ink-700)',
              fontFamily: 'var(--font-sans-cjk)',
              opacity: cleaning ? 0.5 : 1,
            }}
          >
            关闭
          </button>
        </div>

        {/* ── 内容区 ── */}
        <div style={{ padding: '24px 24px 20px' }}>

          {/* 说明卡片 */}
          <div style={{
            background: 'var(--ink-50)',
            border: '1px solid var(--ink-150)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            marginBottom: 20,
            fontSize: 13,
            lineHeight: 1.8,
            fontFamily: 'var(--font-sans-cjk)',
            color: 'var(--ink-600)',
          }}>
            <div style={{ marginBottom: 6 }}>以下内容将被永久删除：</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 4 }}>
              {[
                ['🎞️', '翻译后视频（output.mp4）'],
                ['📝', '字幕文件（output.srt）'],
                ['🎵', '配音音轨（dubbed.mp3）'],
                ['⚙️', '中间缓存（tts、demucs 等工作目录）'],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-700)' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 安全提示 */}
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            background: 'rgba(230,106,61,0.06)',
            border: '1px solid rgba(230,106,61,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: 24,
          }}>
            <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
            <div style={{
              fontSize: 12, lineHeight: 1.7,
              fontFamily: 'var(--font-sans-cjk)', color: 'var(--ink-700)',
            }}>
              <strong style={{ color: 'var(--accent)' }}>正在运行的任务不受影响。</strong><br/>
              此操作不可撤销，请确认已下载所需文件。
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              disabled={cleaning}
              style={{
                flex: 1, padding: '10px 0',
                background: 'var(--ink-100)',
                border: '1px solid var(--ink-200)',
                borderRadius: 'var(--radius-md)',
                cursor: cleaning ? 'not-allowed' : 'pointer',
                fontSize: 13, color: 'var(--ink-700)',
                fontFamily: 'var(--font-sans-cjk)',
                opacity: cleaning ? 0.5 : 1,
              }}
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={cleaning}
              style={{
                flex: 1, padding: '10px 0',
                background: cleaning ? '#e57373' : '#C0392B',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: cleaning ? 'wait' : 'pointer',
                fontSize: 13, color: '#fff', fontWeight: 600,
                fontFamily: 'var(--font-sans-cjk)',
                transition: 'background var(--dur-base)',
              }}
            >
              {cleaning ? '清理中…' : '确认清理'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────
function Header({ onHistoryOpen, onApiOpen }) {
  const [showModal, setShowModal] = useState(false);
  const [toast,     setToast]     = useState(null); // { msg, ok }

  const showToast = (msg, ok) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const btnBase = {
    fontSize: 13, color: 'var(--ink-700)', background: 'transparent',
    border: 'none', cursor: 'pointer', padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-sans-cjk)',
    transition: 'background var(--dur-base)',
  };

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(250, 247, 242, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--ink-150)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '14px 28px',
          display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="../../assets/logo-mark.svg" alt="" width="36" height="36"/>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontFamily: 'var(--font-sans-cjk)', fontSize: 18, fontWeight: 700, color: 'var(--ink-900)' }}>视频翻译工具</span>
              <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>Upload Chinese video · auto translate · subtitles · lip-sync</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onApiOpen}
              style={btnBase}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-100)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ⚙️ API 管理
            </button>
            <button
              onClick={onHistoryOpen}
              style={btnBase}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-100)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              📋 任务历史
            </button>
            <button
              onClick={() => setShowModal(true)}
              style={btnBase}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-100)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title="清理所有已完成/失败的任务缓存"
            >
              🗑️ 清理缓存
            </button>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-500)',
              background: 'var(--ink-100)', padding: '4px 10px', borderRadius: 9999,
            }}>v1.0.0 · localhost:8000</span>
          </div>
        </div>
      </header>

      {showModal && (
        <ClearCacheModal
          onClose={() => setShowModal(false)}
          onConfirmed={(msg, ok) => showToast(msg, ok)}
        />
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </>
  );
}

window.Header = Header;
